"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"

import { isPlatformAdmin, requireCurrentUserId } from "@/lib/auth/platform-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

import { cafeMediaBucket } from "./data"

export type PhotoActionState = {
  error?: string
  success?: string
}

type WorkspaceAccessContext = {
  cafeId: string
  cafeSlug: string
  workspaceSlug: string
}

type CafeMediaRecord = {
  id: string
  cafe_id: string
  storage_bucket: string | null
  storage_path: string
  alt: string | null
  sort_order: number | null
  cafes:
    | {
        slug: string
        workspaces:
          | {
              slug: string
            }
          | null
      }
    | {
        slug: string
        workspaces:
          | {
              slug: string
            }
          | null
      }[]
    | null
}

const maxPhotosPerWorkspace = 3
const maxPhotoSizeBytes = 1024 * 1024
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])
// Clerk Dashboard currently only has Admin and Member. Add org:cafe_admin and
// org:cafe_owner here once those roles are provisioned in Clerk.
const photoManagerRoles = new Set(["org:admin"])

export async function uploadWorkspacePhotosAction(
  _previousState: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  try {
    const workspaceSlug = requireFormValue(formData, "workspaceSlug")
    const context = await requireWorkspacePhotoManager(workspaceSlug)
    const supabase = requireSupabaseAdmin()
    const files = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0)
    const altTexts = formData
      .getAll("altTexts")
      .map((value) => (typeof value === "string" ? value : ""))

    if (files.length === 0) {
      return { error: "Selecciona al menos una imagen." }
    }

    for (const file of files) {
      validateImageFile(file)
    }

    const { data: existingMedia, error: countError } = await supabase
      .from("cafe_media")
      .select("id, sort_order")
      .eq("cafe_id", context.cafeId)
      .order("sort_order")

    if (countError || !existingMedia) {
      throw new Error("No pudimos revisar las fotos actuales.")
    }

    if (existingMedia.length + files.length > maxPhotosPerWorkspace) {
      return { error: "Cada espacio puede tener un máximo de 3 fotos." }
    }

    const nextSortOrder =
      existingMedia.reduce(
        (max, item) => Math.max(max, Number(item.sort_order ?? -1)),
        -1
      ) + 1

    const uploadedPaths: string[] = []

    try {
      const rows = await Promise.all(
        files.map(async (file, index) => {
          const storagePath = await uploadPhotoFile({
            cafeSlug: context.cafeSlug,
            file,
          })
          uploadedPaths.push(storagePath)

          return {
            cafe_id: context.cafeId,
            storage_bucket: cafeMediaBucket,
            storage_path: storagePath,
            alt: cleanAltText(altTexts[index] ?? ""),
            sort_order: nextSortOrder + index,
            status: "approved",
          }
        })
      )

      const { error } = await supabase.from("cafe_media").insert(rows)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      await removeStorageObjects(uploadedPaths)
      throw error
    }

    revalidatePhotoPaths(context)

    return { success: "Fotos subidas y publicadas." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

export async function replaceWorkspacePhotoAction(
  _previousState: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  try {
    const photoId = requireFormValue(formData, "photoId")
    const file = formData.get("photo")

    if (!(file instanceof File) || file.size === 0) {
      return { error: "Selecciona una imagen para reemplazar la foto." }
    }

    validateImageFile(file)

    const supabase = requireSupabaseAdmin()
    const currentPhoto = await getAuthorizedPhoto(photoId)
    const cafe = Array.isArray(currentPhoto.cafes)
      ? currentPhoto.cafes[0]
      : currentPhoto.cafes

    if (!cafe) {
      throw new Error("No pudimos encontrar el local asociado.")
    }

    const oldPath =
      currentPhoto.storage_bucket === cafeMediaBucket
        ? currentPhoto.storage_path
        : null
    const newPath = await uploadPhotoFile({
      cafeSlug: cafe.slug,
      file,
    })

    const { error } = await supabase
      .from("cafe_media")
      .update({
        storage_bucket: cafeMediaBucket,
        storage_path: newPath,
        alt: cleanAltText(String(formData.get("alt") ?? currentPhoto.alt ?? "")),
        status: "approved",
      })
      .eq("id", photoId)

    if (error) {
      await removeStorageObjects([newPath])
      throw new Error(error.message)
    }

    if (oldPath) {
      await removeStorageObjects([oldPath], { throwOnError: true })
    }

    revalidatePhotoPaths({
      cafeId: currentPhoto.cafe_id,
      cafeSlug: cafe.slug,
      workspaceSlug: cafe.workspaces?.slug ?? "",
    })

    return { success: "Foto reemplazada." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

export async function updateWorkspacePhotoMetaAction(
  _previousState: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  try {
    const photoId = requireFormValue(formData, "photoId")
    const alt = cleanAltText(requireFormValue(formData, "alt"))
    const currentPhoto = await getAuthorizedPhoto(photoId)
    const cafe = Array.isArray(currentPhoto.cafes)
      ? currentPhoto.cafes[0]
      : currentPhoto.cafes

    if (!cafe) {
      throw new Error("No pudimos encontrar el local asociado.")
    }

    const { error } = await requireSupabaseAdmin()
      .from("cafe_media")
      .update({ alt })
      .eq("id", photoId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePhotoPaths({
      cafeId: currentPhoto.cafe_id,
      cafeSlug: cafe.slug,
      workspaceSlug: cafe.workspaces?.slug ?? "",
    })

    return { success: "Texto alternativo actualizado." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

export async function deleteWorkspacePhotoAction(
  _previousState: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  try {
    const photoId = requireFormValue(formData, "photoId")
    const currentPhoto = await getAuthorizedPhoto(photoId)
    const cafe = Array.isArray(currentPhoto.cafes)
      ? currentPhoto.cafes[0]
      : currentPhoto.cafes
    const oldPath =
      currentPhoto.storage_bucket === cafeMediaBucket
        ? currentPhoto.storage_path
        : null

    const { error } = await requireSupabaseAdmin()
      .from("cafe_media")
      .delete()
      .eq("id", photoId)

    if (error) {
      throw new Error(error.message)
    }

    if (oldPath) {
      await removeStorageObjects([oldPath], { throwOnError: true })
    }

    revalidatePhotoPaths({
      cafeId: currentPhoto.cafe_id,
      cafeSlug: cafe?.slug ?? "",
      workspaceSlug: cafe?.workspaces?.slug ?? "",
    })

    return { success: "Foto eliminada." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

async function requireWorkspacePhotoManager(
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

    if (session.orgSlug !== workspaceSlug || !photoManagerRoles.has(orgRole)) {
      throw new Error("No tienes permisos para administrar fotos de este espacio.")
    }
  }

  return {
    cafeId: cafe.id,
    cafeSlug: cafe.slug,
    workspaceSlug: workspace.slug,
  }
}

async function getAuthorizedPhoto(photoId: string) {
  const supabase = requireSupabaseAdmin()
  const { data, error } = await supabase
    .from("cafe_media")
    .select("id, cafe_id, storage_bucket, storage_path, alt, sort_order, cafes(slug, workspaces(slug))")
    .eq("id", photoId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Foto no encontrada.")
  }

  const photo = data as unknown as CafeMediaRecord
  const cafe = Array.isArray(photo.cafes) ? photo.cafes[0] : photo.cafes
  const workspaceSlug = cafe?.workspaces?.slug

  if (!workspaceSlug) {
    throw new Error("No pudimos validar el workspace de esta foto.")
  }

  await requireWorkspacePhotoManager(workspaceSlug)

  return photo
}

async function uploadPhotoFile({
  cafeSlug,
  file,
}: {
  cafeSlug: string
  file: File
}) {
  const extension = allowedImageTypes.get(file.type)

  if (!extension) {
    throw new Error("Formato de imagen no permitido.")
  }

  const storagePath = `cafes/${cafeSlug}/${randomUUID()}.${extension}`
  const { error } = await requireSupabaseAdmin()
    .storage
    .from(cafeMediaBucket)
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`No pudimos subir la imagen: ${error.message}`)
  }

  return storagePath
}

async function removeStorageObjects(
  paths: string[],
  options: { throwOnError?: boolean } = {}
) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]

  if (uniquePaths.length === 0) {
    return
  }

  const { error } = await requireSupabaseAdmin()
    .storage
    .from(cafeMediaBucket)
    .remove(uniquePaths)

  if (error) {
    if (options.throwOnError) {
      throw new Error(`No pudimos borrar la imagen antigua: ${error.message}`)
    }

    console.error("Failed to remove cafe media from storage:", error.message)
  }
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Solo se permiten imágenes JPG, PNG o WebP.")
  }

  if (file.size > maxPhotoSizeBytes) {
    throw new Error("Cada imagen debe pesar 1 MB o menos.")
  }
}

function cleanAltText(value: string) {
  const trimmed = value.trim()

  return trimmed || "Foto del local"
}

function revalidatePhotoPaths(context: WorkspaceAccessContext) {
  revalidatePath("/")
  revalidatePath("/cafeterias/[slug]", "page")

  if (context.cafeSlug) {
    revalidatePath(`/cafeterias/${context.cafeSlug}`)
  }

  if (context.workspaceSlug) {
    revalidatePath(`/dashboard/${context.workspaceSlug}/fotos`)
  }
}

function requireSupabaseAdmin() {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin no está configurado.")
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
