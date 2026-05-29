"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import { isPlatformAdmin, requireCurrentUserId } from "@/lib/auth/platform-admin"
import { eventMediaBucket, isWorkspaceManagerRole } from "@/lib/data/events"
import { slugify } from "@/lib/slug"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type EventActionState = {
  error?: string
  success?: string
}

type WorkspaceEventContext = {
  workspaceId: string
  workspaceSlug: string
  cafeId: string
  cafeSlug: string
  canPublish: boolean
}

const maxEventImages = 3
const maxImageSizeBytes = 5 * 1024 * 1024
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

const eventSchema = z.object({
  workspaceSlug: z.string().trim().min(1),
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(160).optional(),
  description: z.string().trim().min(10).max(6000),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim().min(1),
  address: z.string().trim().min(3).max(220),
  externalUrl: z.union([z.url(), z.literal("")]).optional(),
})

export async function createWorkspaceEventAction(
  _previousState: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  const uploadedPaths: string[] = []

  try {
    const parsed = eventSchema.safeParse({
      workspaceSlug: formData.get("workspaceSlug"),
      title: formData.get("title"),
      subtitle: formData.get("subtitle"),
      description: formData.get("description"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      address: formData.get("address"),
      externalUrl: formData.get("externalUrl"),
    })

    if (!parsed.success) {
      return { error: "Revisa los campos del evento antes de publicar." }
    }

    const values = parsed.data
    const startsAt = new Date(values.startsAt)
    const endsAt = new Date(values.endsAt)

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return { error: "Usa fechas validas para el evento." }
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      return { error: "La fecha de termino debe ser posterior al inicio." }
    }

    const context = await requireWorkspaceEventManager(values.workspaceSlug)
    const supabase = requireSupabaseAdmin()
    const files = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0)
    const altTexts = formData
      .getAll("altTexts")
      .map((value) => (typeof value === "string" ? value.trim() : ""))
    const tags = uniqueList(formData.getAll("tags"))

    if (files.length > maxEventImages) {
      return { error: "Cada evento puede tener un maximo de 3 imagenes." }
    }

    for (const file of files) {
      validateImageFile(file)
    }

    const eventId = randomUUID()
    const slug = await uniqueEventSlug(values.title, eventId)
    const status = context.canPublish ? "published" : "pending_review"
    const now = new Date().toISOString()

    const { error: eventError } = await supabase.from("events").insert({
      id: eventId,
      workspace_id: context.workspaceId,
      slug,
      title: values.title,
      subtitle: emptyToNull(values.subtitle),
      description: values.description,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      address: values.address,
      external_url: emptyToNull(values.externalUrl),
      status,
      published_at: status === "published" ? now : null,
      created_by_clerk_user_id: await requireCurrentUserId(),
    })

    if (eventError) {
      throw new Error(eventError.message)
    }

    try {
      if (files.length > 0) {
        const mediaRows = await Promise.all(
          files.map(async (file, index) => {
            const storagePath = await uploadEventImage({
              workspaceSlug: context.workspaceSlug,
              eventSlug: slug,
              file,
            })
            uploadedPaths.push(storagePath)

            return {
              event_id: eventId,
              storage_bucket: eventMediaBucket,
              storage_path: storagePath,
              alt: altTexts[index] || values.title,
              sort_order: index,
            }
          })
        )
        const { error } = await supabase.from("event_media").insert(mediaRows)

        if (error) {
          throw new Error(error.message)
        }
      }

      await replaceEventTags(eventId, tags)

      if (status === "published") {
        await createNotificationsForFavoriteUsers({
          cafeId: context.cafeId,
          eventId,
          expiresAt: endsAt.toISOString(),
        })
      }
    } catch (error) {
      await supabase.from("events").delete().eq("id", eventId)
      await removeEventImages(uploadedPaths)
      throw error
    }

    revalidateEventPaths(context, slug)

    return {
      success:
        status === "published"
          ? "Evento publicado."
          : "Evento enviado a revision.",
    }
  } catch (error) {
    return { error: readableError(error) }
  }
}

export async function updateWorkspaceEventAction(
  _previousState: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  try {
    const eventId = requireFormValue(formData, "eventId")
    const parsed = eventSchema.safeParse({
      workspaceSlug: formData.get("workspaceSlug"),
      title: formData.get("title"),
      subtitle: formData.get("subtitle"),
      description: formData.get("description"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      address: formData.get("address"),
      externalUrl: formData.get("externalUrl"),
    })

    if (!parsed.success) {
      return { error: "Revisa los campos del evento antes de guardar." }
    }

    const values = parsed.data
    const startsAt = new Date(values.startsAt)
    const endsAt = new Date(values.endsAt)

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return { error: "Usa fechas validas para el evento." }
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      return { error: "La fecha de termino debe ser posterior al inicio." }
    }

    const context = await requireEventManagerByEventId(eventId)
    const tags = uniqueList(formData.getAll("tags"))
    const { data: current } = await requireSupabaseAdmin()
      .from("events")
      .select("slug, status")
      .eq("id", eventId)
      .maybeSingle()

    const { error } = await requireSupabaseAdmin()
      .from("events")
      .update({
        title: values.title,
        subtitle: emptyToNull(values.subtitle),
        description: values.description,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        address: values.address,
        external_url: emptyToNull(values.externalUrl),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)

    if (error) {
      throw new Error(error.message)
    }

    await replaceEventTags(eventId, tags)

    if (current?.status === "published") {
      await refreshNotificationsForEvent(eventId, endsAt.toISOString())
    }

    revalidateEventPaths(context, current?.slug)

    return { success: "Evento actualizado." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

export async function deleteWorkspaceEventAction(
  _previousState: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  try {
    const eventId = requireFormValue(formData, "eventId")
    const context = await requireEventManagerByEventId(eventId)
    const supabase = requireSupabaseAdmin()
    const { data: media } = await supabase
      .from("event_media")
      .select("storage_path")
      .eq("event_id", eventId)

    const { error } = await supabase.from("events").delete().eq("id", eventId)

    if (error) {
      throw new Error(error.message)
    }

    await removeEventImages(
      (media ?? [])
        .map((item) => item.storage_path)
        .filter((path): path is string => typeof path === "string")
    )
    revalidateEventPaths(context)

    return { success: "Evento eliminado." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

async function requireWorkspaceEventManager(
  workspaceSlug: string
): Promise<WorkspaceEventContext> {
  const userId = await requireCurrentUserId()
  const session = await auth()
  const platformAdmin = await isPlatformAdmin(userId)
  const supabase = requireSupabaseAdmin()
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, slug, cafes(id, slug)")
    .eq("slug", workspaceSlug)
    .maybeSingle()

  if (error || !workspace) {
    throw new Error("Workspace no encontrado.")
  }

  const cafe = firstRelation(workspace.cafes)

  if (!cafe) {
    throw new Error("Este workspace no tiene un local asociado.")
  }

  if (!platformAdmin) {
    const orgRole = getCurrentOrgRole(session)

    if (session.orgSlug !== workspaceSlug || !isWorkspaceManagerRole(orgRole)) {
      throw new Error("No tienes permisos para administrar eventos.")
    }
  }

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    cafeId: cafe.id,
    cafeSlug: cafe.slug,
    canPublish:
      platformAdmin ||
      new Set(["org:admin", "org:cafe_owner", "org:cafe_admin"]).has(
        getCurrentOrgRole(session)
      ),
  }
}

async function requireEventManagerByEventId(
  eventId: string
): Promise<WorkspaceEventContext> {
  const supabase = requireSupabaseAdmin()
  const { data, error } = await supabase
    .from("events")
    .select("workspaces(slug)")
    .eq("id", eventId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Evento no encontrado.")
  }

  const workspace = firstRelation(data.workspaces)

  if (!workspace?.slug) {
    throw new Error("No pudimos validar el workspace del evento.")
  }

  return requireWorkspaceEventManager(workspace.slug)
}

async function uniqueEventSlug(title: string, eventId: string) {
  const supabase = requireSupabaseAdmin()
  const base = slugify(title) || "evento"
  let candidate = base

  for (let index = 0; index < 5; index += 1) {
    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle()

    if (!data) {
      return candidate
    }

    candidate = `${base}-${index + 2}`
  }

  return `${base}-${eventId.slice(0, 8)}`
}

async function uploadEventImage({
  workspaceSlug,
  eventSlug,
  file,
}: {
  workspaceSlug: string
  eventSlug: string
  file: File
}) {
  const extension = allowedImageTypes.get(file.type)

  if (!extension) {
    throw new Error("Formato de imagen no permitido.")
  }

  const storagePath = `events/${workspaceSlug}/${eventSlug}/${randomUUID()}.${extension}`
  const { error } = await requireSupabaseAdmin()
    .storage
    .from(eventMediaBucket)
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`No pudimos subir la imagen: ${error.message}`)
  }

  return storagePath
}

async function replaceEventTags(eventId: string, tags: string[]) {
  const supabase = requireSupabaseAdmin()
  await supabase.from("event_tags").delete().eq("event_id", eventId)

  for (const tag of tags) {
    const slug = slugify(tag)

    if (!slug) {
      continue
    }

    const { error: tagError } = await supabase
      .from("tags")
      .upsert({ slug, name: tag }, { onConflict: "slug" })

    if (tagError) {
      throw new Error(tagError.message)
    }

    const { error } = await supabase
      .from("event_tags")
      .insert({ event_id: eventId, tag_slug: slug })

    if (error) {
      throw new Error(error.message)
    }
  }
}

async function createNotificationsForFavoriteUsers({
  cafeId,
  eventId,
  expiresAt,
}: {
  cafeId: string
  eventId: string
  expiresAt: string
}) {
  const supabase = requireSupabaseAdmin()
  const { data: favorites, error } = await supabase
    .from("cafe_favorites")
    .select("clerk_user_id")
    .eq("cafe_id", cafeId)

  if (error || !favorites?.length) {
    return
  }

  const rows = [...new Set(favorites.map((favorite) => favorite.clerk_user_id))]
    .filter(Boolean)
    .map((userId) => ({
      recipient_clerk_user_id: userId,
      event_id: eventId,
      expires_at: expiresAt,
    }))

  if (rows.length === 0) {
    return
  }

  const { error: notificationError } = await supabase
    .from("event_notifications")
    .upsert(rows, { onConflict: "recipient_clerk_user_id,event_id" })

  if (notificationError) {
    throw new Error(notificationError.message)
  }
}

async function refreshNotificationsForEvent(eventId: string, expiresAt: string) {
  const { error } = await requireSupabaseAdmin()
    .from("event_notifications")
    .update({ expires_at: expiresAt })
    .eq("event_id", eventId)

  if (error) {
    throw new Error(error.message)
  }
}

async function removeEventImages(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]

  if (uniquePaths.length === 0) {
    return
  }

  const { error } = await requireSupabaseAdmin()
    .storage
    .from(eventMediaBucket)
    .remove(uniquePaths)

  if (error) {
    console.error("Failed to remove event media:", error.message)
  }
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Solo se permiten imagenes JPG, PNG o WebP.")
  }

  if (file.size > maxImageSizeBytes) {
    throw new Error("Cada imagen debe pesar 5 MB o menos.")
  }
}

function revalidateEventPaths(context: WorkspaceEventContext, eventSlug?: string) {
  revalidatePath(`/dashboard/${context.workspaceSlug}/eventos`)
  revalidatePath("/feed")
  revalidatePath("/feed/explorar")

  if (eventSlug) {
    revalidatePath(`/eventos/${eventSlug}`)
  }
}

function requireSupabaseAdmin() {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin no esta configurado.")
  }

  return supabase
}

function requireFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Formulario incompleto.")
  }

  return value.trim()
}

function uniqueList(values: FormDataEntryValue[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    if (typeof value !== "string") {
      continue
    }

    const trimmed = value.trim()
    const key = trimmed.toLowerCase()

    if (trimmed && !seen.has(key)) {
      seen.add(key)
      result.push(trimmed)
    }
  }

  return result.slice(0, 8)
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function readableError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No pudimos completar la accion."
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getCurrentOrgRole(session: Awaited<ReturnType<typeof auth>>) {
  const claims = session.sessionClaims as Record<string, unknown> | null | undefined
  const claimRole = claims?.org_role

  if (typeof claimRole === "string") {
    return claimRole
  }

  const sessionWithRole = session as typeof session & { orgRole?: unknown }

  return typeof sessionWithRole.orgRole === "string" ? sessionWithRole.orgRole : ""
}
