"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import { isPlatformAdmin, requireCurrentUserId } from "@/lib/auth/platform-admin"
import { slugify } from "@/lib/slug"
import {
  normalizeSocialHandle,
  socialHandle,
  socialUrl,
} from "@/lib/social-links"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type WorkspaceProfileActionState = {
  error?: string
  success?: string
}

type WorkspaceAccessContext = {
  cafeId: string
  cafeSlug: string
  workspaceSlug: string
}

const profileSchema = z.object({
  workspaceSlug: z.string().trim().min(1),
  commune: z.string().trim().min(2),
  description: z.string().trim().min(2),
  hoursText: z.string().trim().optional(),
  contactEmail: z.union([z.email(), z.literal("")]).optional(),
  contactPhone: z.string().trim().optional(),
  addresses: z.string().trim().min(5),
  website: z.union([z.url(), z.literal("")]).optional(),
  tiktok: z.string().trim().optional(),
  x: z.string().trim().optional(),
  otherSocial: z.string().trim().optional(),
})

// Clerk Dashboard currently only has Admin and Member. Add org:cafe_admin and
// org:cafe_owner here once those roles are provisioned in Clerk.
const profileManagerRoles = new Set(["org:admin"])

export async function updateWorkspaceProfileAction(
  _previousState: WorkspaceProfileActionState,
  formData: FormData
): Promise<WorkspaceProfileActionState> {
  try {
    const parsed = profileSchema.safeParse({
      workspaceSlug: formData.get("workspaceSlug"),
      commune: formData.get("commune"),
      description: formData.get("description"),
      hoursText: formData.get("hoursText"),
      contactEmail: formData.get("contactEmail"),
      contactPhone: formData.get("contactPhone"),
      addresses: formData.get("addresses"),
      website: formData.get("website"),
      tiktok: formData.get("tiktok"),
      x: formData.get("x"),
      otherSocial: formData.get("otherSocial"),
    })

    if (!parsed.success) {
      return { error: "Revisa los campos antes de guardar el perfil." }
    }

    const values = parsed.data
    const context = await requireWorkspaceProfileManager(values.workspaceSlug)
    const addresses = splitLines(values.addresses)

    if (addresses.length === 0) {
      return { error: "Agrega al menos una dirección." }
    }

    const features = uniqueList(formData.getAll("features"))
    const tags = uniqueList(formData.getAll("tags"))
    const supabase = requireSupabaseAdmin()

    const { error: cafeError } = await supabase
      .from("cafes")
      .update({
        commune: values.commune,
        description: values.description,
        contact_email: emptyToNull(values.contactEmail),
        contact_phone: emptyToNull(values.contactPhone),
        hours_text: emptyToNull(values.hoursText),
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.cafeId)

    if (cafeError) {
      throw new Error(cafeError.message)
    }

    await Promise.all([
      replaceLocations(context.cafeId, addresses, values.commune),
      replaceSocialLinks(context.cafeId, {
        website: values.website,
        tiktok: values.tiktok,
        x: values.x,
        otherSocial: values.otherSocial,
      }),
      replaceFeatures(context.cafeId, features),
      replaceTags(context.cafeId, tags),
    ])

    revalidateProfilePaths(context)

    return { success: "Perfil actualizado." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

async function requireWorkspaceProfileManager(
  workspaceSlug: string
): Promise<WorkspaceAccessContext> {
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
    throw new Error("Este workspace todavía no tiene un local asociado.")
  }

  if (!platformAdmin) {
    const orgRole = getCurrentOrgRole(session)

    if (session.orgSlug !== workspaceSlug || !profileManagerRoles.has(orgRole)) {
      throw new Error("No tienes permisos para editar este perfil.")
    }
  }

  return {
    cafeId: cafe.id,
    cafeSlug: cafe.slug,
    workspaceSlug: workspace.slug,
  }
}

async function replaceLocations(
  cafeId: string,
  addresses: string[],
  commune: string
) {
  const supabase = requireSupabaseAdmin()

  const { error: deleteError } = await supabase
    .from("cafe_locations")
    .delete()
    .eq("cafe_id", cafeId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const { error } = await supabase.from("cafe_locations").insert(
    addresses.map((address, index) => ({
      cafe_id: cafeId,
      address,
      commune,
      sort_order: index,
    }))
  )

  if (error) {
    throw new Error(error.message)
  }
}

async function replaceSocialLinks(
  cafeId: string,
  values: {
    website?: string
    tiktok?: string
    x?: string
    otherSocial?: string
  }
) {
  const supabase = requireSupabaseAdmin()

  const { error: deleteError } = await supabase
    .from("cafe_social_links")
    .delete()
    .eq("cafe_id", cafeId)
    .in("platform", ["website", "tiktok", "x", "other"])

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const rows = [
    values.website
      ? {
          cafe_id: cafeId,
          platform: "website",
          url: values.website,
          handle: null,
          normalized_handle: null,
          label: "Website",
        }
      : null,
    values.tiktok
      ? {
          cafe_id: cafeId,
          platform: "tiktok",
          url: socialUrl("tiktok", values.tiktok),
          handle: socialHandle(values.tiktok),
          normalized_handle: normalizeSocialHandle(values.tiktok),
          label: "TikTok",
        }
      : null,
    values.x
      ? {
          cafe_id: cafeId,
          platform: "x",
          url: socialUrl("x", values.x),
          handle: socialHandle(values.x),
          normalized_handle: normalizeSocialHandle(values.x),
          label: "X",
        }
      : null,
    values.otherSocial
      ? {
          cafe_id: cafeId,
          platform: "other",
          url: values.otherSocial.startsWith("http") ? values.otherSocial : "",
          handle: values.otherSocial.startsWith("http")
            ? null
            : socialHandle(values.otherSocial),
          normalized_handle: null,
          label: "Otro",
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row))

  if (rows.length === 0) {
    return
  }

  const { error } = await supabase.from("cafe_social_links").insert(rows)

  if (error) {
    throw new Error(error.message)
  }
}

async function replaceFeatures(cafeId: string, features: string[]) {
  const supabase = requireSupabaseAdmin()

  const { error: deleteError } = await supabase
    .from("cafe_features")
    .delete()
    .eq("cafe_id", cafeId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  for (const feature of features) {
    const slug = slugify(feature)

    const { error: featureError } = await supabase
      .from("features")
      .upsert({ slug, label: feature }, { onConflict: "slug" })

    if (featureError) {
      throw new Error(featureError.message)
    }

    const { error } = await supabase
      .from("cafe_features")
      .insert({ cafe_id: cafeId, feature_slug: slug })

    if (error) {
      throw new Error(error.message)
    }
  }
}

async function replaceTags(cafeId: string, tags: string[]) {
  const supabase = requireSupabaseAdmin()

  const { error: deleteError } = await supabase
    .from("cafe_tags")
    .delete()
    .eq("cafe_id", cafeId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  for (const tag of tags) {
    const slug = slugify(tag)

    const { error: tagError } = await supabase
      .from("tags")
      .upsert({ slug, name: tag }, { onConflict: "slug" })

    if (tagError) {
      throw new Error(tagError.message)
    }

    const { error } = await supabase
      .from("cafe_tags")
      .insert({ cafe_id: cafeId, tag_slug: slug })

    if (error) {
      throw new Error(error.message)
    }
  }
}

function revalidateProfilePaths(context: WorkspaceAccessContext) {
  revalidatePath("/")
  revalidatePath("/cafeterias/[slug]", "page")
  revalidatePath(`/cafeterias/${context.cafeSlug}`)
  revalidatePath(`/dashboard/${context.workspaceSlug}/perfil`)
}

function requireSupabaseAdmin() {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin no está configurado.")
  }

  return supabase
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueList(values: FormDataEntryValue[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    if (typeof value !== "string") {
      continue
    }

    const label = value.trim()
    const slug = slugify(label)

    if (!label || seen.has(slug)) {
      continue
    }

    seen.add(slug)
    result.push(label)
  }

  return result
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

function readableError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No pudimos completar la acción."
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
