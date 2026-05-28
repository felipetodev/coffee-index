"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireCurrentUserId } from "@/lib/auth/platform-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type ReviewActionState = {
  error?: string
  success?: string
}

export type FavoriteActionState = {
  error?: string
  success?: string
  isFavorite?: boolean
}

const reviewSchema = z.object({
  cafeId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(85),
})

const reviewMediaBucket = "review-media"
const reviewCooldownMs = 2 * 60 * 60 * 1000
const maxReviewPhotos = 3
const maxPhotoSizeBytes = 5 * 1024 * 1024 // 5 MB
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export async function submitCafeReviewAction(
  _previousState: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  try {
    const authorClerkUserId = await requireCurrentUserId()
    const parsed = reviewSchema.safeParse({
      cafeId: formData.get("cafeId"),
      rating: formData.get("rating"),
      body: formData.get("body"),
    })

    if (!parsed.success) {
      return {
        error: "Agrega una calificación y una reseña de al menos 80 caracteres.",
      }
    }

    const supabase = requireSupabaseAdmin()
    const { data: cafe, error: cafeError } = await supabase
      .from("cafes")
      .select("id, slug, status")
      .eq("id", parsed.data.cafeId)
      .eq("status", "published")
      .maybeSingle()

    if (cafeError || !cafe) {
      throw new Error("No pudimos encontrar este local.")
    }

    const { data: existingReview } = await supabase
      .from("cafe_reviews")
      .select("id, last_submitted_at")
      .eq("cafe_id", cafe.id)
      .eq("author_clerk_user_id", authorClerkUserId)
      .maybeSingle()

    if (existingReview) {
      const nextReviewAt =
        new Date(existingReview.last_submitted_at).getTime() + reviewCooldownMs

      if (nextReviewAt > Date.now()) {
        return {
          error:
            "Ya enviaste una reseña recientemente. Puedes editarla nuevamente en 2 horas.",
        }
      }
    }

    const files = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0)
    const altTexts = formData
      .getAll("altTexts")
      .map((value) => (typeof value === "string" ? value : ""))
    const removeExistingPhotos = formData.get("removeExistingPhotos") === "on"

    if (files.length > maxReviewPhotos) {
      return { error: "Puedes adjuntar un máximo de 3 fotos." }
    }

    for (const file of files) {
      validateImageFile(file)
    }

    const submittedAt = new Date().toISOString()
    const { data: review, error: reviewError } = existingReview
      ? await supabase
          .from("cafe_reviews")
          .update({
            rating: parsed.data.rating,
            body: parsed.data.body,
            status: "pending",
            reviewed_at: null,
            last_submitted_at: submittedAt,
            updated_at: submittedAt,
          })
          .eq("id", existingReview.id)
          .select("id")
          .single()
      : await supabase
          .from("cafe_reviews")
          .insert({
            cafe_id: cafe.id,
            author_clerk_user_id: authorClerkUserId,
            rating: parsed.data.rating,
            body: parsed.data.body,
            status: "pending",
            last_submitted_at: submittedAt,
          })
          .select("id")
          .single()

    if (reviewError || !review) {
      throw new Error(reviewError?.message ?? "No pudimos guardar tu reseña.")
    }

    if (files.length > 0) {
      await replaceReviewMedia({
        altTexts,
        cafeSlug: cafe.slug,
        files,
        reviewId: review.id,
      })
    } else if (removeExistingPhotos) {
      await deleteReviewMedia(review.id)
    }

    revalidatePath(`/cafeterias/${cafe.slug}`)
    revalidatePath(`/cafeterias/${cafe.slug}/review`)
    revalidatePath("/admin/reviews")

    return { success: "Tu reseña fue enviada y quedará visible cuando sea aprobada." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

export async function toggleCafeFavoriteAction(
  _previousState: FavoriteActionState,
  formData: FormData
): Promise<FavoriteActionState> {
  try {
    const clerkUserId = await requireCurrentUserId()
    const cafeId = String(formData.get("cafeId") ?? "")
    const supabase = requireSupabaseAdmin()

    if (!cafeId) {
      return { error: "No pudimos guardar este local." }
    }

    const { data: existingFavorite } = await supabase
      .from("cafe_favorites")
      .select("id")
      .eq("cafe_id", cafeId)
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle()

    if (existingFavorite) {
      const { error } = await supabase
        .from("cafe_favorites")
        .delete()
        .eq("id", existingFavorite.id)

      if (error) {
        throw new Error(error.message)
      }

      revalidatePath("/")

      return { success: "Local removido de favoritos.", isFavorite: false }
    }

    const { error } = await supabase.from("cafe_favorites").insert({
      cafe_id: cafeId,
      clerk_user_id: clerkUserId,
    })

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath("/")

    return { success: "Local guardado en favoritos.", isFavorite: true }
  } catch (error) {
    return { error: readableError(error) }
  }
}

async function deleteReviewMedia(reviewId: string) {
  const supabase = requireSupabaseAdmin()
  const { data: existingMedia, error: mediaError } = await supabase
    .from("cafe_review_media")
    .select("storage_bucket, storage_path")
    .eq("review_id", reviewId)

  if (mediaError) {
    throw new Error(mediaError.message)
  }

  const { error: deleteError } = await supabase
    .from("cafe_review_media")
    .delete()
    .eq("review_id", reviewId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  await removeStorageObjects(
    (existingMedia ?? [])
      .filter((item) => item.storage_bucket === reviewMediaBucket)
      .map((item) => item.storage_path)
  )
}

async function replaceReviewMedia({
  altTexts,
  cafeSlug,
  files,
  reviewId,
}: {
  altTexts: string[]
  cafeSlug: string
  files: File[]
  reviewId: string
}) {
  const supabase = requireSupabaseAdmin()
  const { data: existingMedia, error: mediaError } = await supabase
    .from("cafe_review_media")
    .select("storage_bucket, storage_path")
    .eq("review_id", reviewId)

  if (mediaError) {
    throw new Error(mediaError.message)
  }

  const uploadedPaths: string[] = []

  try {
    const rows = await Promise.all(
      files.map(async (file, index) => {
        const storagePath = await uploadReviewPhoto({
          cafeSlug,
          file,
          reviewId,
        })
        uploadedPaths.push(storagePath)

        return {
          review_id: reviewId,
          storage_bucket: reviewMediaBucket,
          storage_path: storagePath,
          alt: cleanAltText(altTexts[index] ?? "", index),
          sort_order: index,
        }
      })
    )

    const { error: deleteError } = await supabase
      .from("cafe_review_media")
      .delete()
      .eq("review_id", reviewId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    const { error: insertError } = await supabase
      .from("cafe_review_media")
      .insert(rows)

    if (insertError) {
      throw new Error(insertError.message)
    }

    await removeStorageObjects(
      (existingMedia ?? [])
        .filter((item) => item.storage_bucket === reviewMediaBucket)
        .map((item) => item.storage_path)
    )
  } catch (error) {
    await removeStorageObjects(uploadedPaths)
    throw error
  }
}

async function uploadReviewPhoto({
  cafeSlug,
  file,
  reviewId,
}: {
  cafeSlug: string
  file: File
  reviewId: string
}) {
  const extension = allowedImageTypes.get(file.type)

  if (!extension) {
    throw new Error("Formato de imagen no permitido.")
  }

  const storagePath = `reviews/${cafeSlug}/${reviewId}/${randomUUID()}.${extension}`
  const { error } = await requireSupabaseAdmin()
    .storage
    .from(reviewMediaBucket)
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`No pudimos subir la imagen: ${error.message}`)
  }

  return storagePath
}

async function removeStorageObjects(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]

  if (uniquePaths.length === 0) {
    return
  }

  const { error } = await requireSupabaseAdmin()
    .storage
    .from(reviewMediaBucket)
    .remove(uniquePaths)

  if (error) {
    console.error("Failed to remove review media from storage:", error.message)
  }
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Solo se permiten imágenes JPG, PNG o WebP.")
  }

  if (file.size > maxPhotoSizeBytes) {
    throw new Error(`Cada imagen debe pesar ${maxPhotoSizeBytes / (1024 * 1024)} MB o menos.`)
  }
}

function cleanAltText(value: string, index: number) {
  const trimmed = value.trim()

  return trimmed || `Foto adjunta a la reseña ${index + 1}`
}

function requireSupabaseAdmin() {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin no está configurado.")
  }

  return supabase
}

function readableError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No pudimos completar la acción."
}
