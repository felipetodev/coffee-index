import "server-only"

import { auth } from "@clerk/nextjs/server"

import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { createPublicSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server"

export type ReviewStatus = "pending" | "approved" | "rejected"

export type CafeReviewViewModel = {
  id: string
  cafeId: string
  authorClerkUserId: string
  rating: number
  body: string
  status: ReviewStatus
  lastSubmittedAt: string
  createdAt: string
  authorName: string
  authorImageUrl: string | null
  viewerCanSeeStatus: boolean
  media: CafeReviewMediaViewModel[]
}

export type CafeReviewMediaViewModel = {
  id: string
  url: string
  alt: string
  sortOrder: number
}

export type ViewerCafeState = {
  isSignedIn: boolean
  isFavorite: boolean
  ownReview: CafeReviewViewModel | null
  canSubmitReview: boolean
  nextReviewAt: string | null
}

export type AdminCafeReviewViewModel = CafeReviewViewModel & {
  cafeName: string
  cafeSlug: string
}

type ReviewRow = {
  id: string
  cafe_id: string
  author_clerk_user_id: string
  rating: number
  body: string
  status: ReviewStatus
  last_submitted_at: string
  created_at: string
  cafe_review_media: ReviewMediaRow[] | null
}

type AdminReviewRow = ReviewRow & {
  cafes:
    | {
        name: string
        slug: string
      }
    | {
        name: string
        slug: string
      }[]
    | null
}

type ReviewMediaRow = {
  id: string
  storage_bucket: string | null
  storage_path: string
  alt: string | null
  sort_order: number | null
}

type ProfileRow = {
  clerk_user_id: string
  name: string | null
  image_url: string | null
}

const reviewCooldownMs = 2 * 60 * 60 * 1000

export async function getApprovedCafeReviews(
  cafeId: string
): Promise<CafeReviewViewModel[]> {
  const supabase = createSupabaseAdminClient() ?? createPublicSupabaseClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("cafe_reviews")
    .select(
      "id, cafe_id, author_clerk_user_id, rating, body, status, last_submitted_at, created_at, cafe_review_media(id, storage_bucket, storage_path, alt, sort_order)"
    )
    .eq("cafe_id", cafeId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  const rows = data as unknown as ReviewRow[]
  const profilesByUserId = await getProfilesByUserId(
    rows.map((row) => row.author_clerk_user_id)
  )

  return rows.map((row) => mapReviewRow(row, profilesByUserId))
}

export async function getVisibleCafeReviews(
  cafeId: string
): Promise<CafeReviewViewModel[]> {
  const { userId } = await auth()
  const canSeeAllStatuses = await isPlatformAdmin(userId)
  const supabase = createSupabaseAdminClient() ?? createPublicSupabaseClient()

  if (!supabase) {
    return []
  }

  let query = supabase
    .from("cafe_reviews")
    .select(
      "id, cafe_id, author_clerk_user_id, rating, body, status, last_submitted_at, created_at, cafe_review_media(id, storage_bucket, storage_path, alt, sort_order)"
    )
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })

  if (!canSeeAllStatuses) {
    query = userId
      ? query.or(`status.eq.approved,author_clerk_user_id.eq.${userId}`)
      : query.eq("status", "approved")
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  const rows = data as unknown as ReviewRow[]
  const profilesByUserId = await getProfilesByUserId(
    rows.map((row) => row.author_clerk_user_id)
  )

  return rows.map((row) =>
    mapReviewRow(row, profilesByUserId, {
      viewerCanSeeStatus:
        row.status !== "approved" &&
        (canSeeAllStatuses || row.author_clerk_user_id === userId),
    })
  )
}

export async function getViewerFavoriteCafeIds(
  userId: string | null
): Promise<string[]> {
  if (!userId) {
    return []
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("cafe_favorites")
    .select("cafe_id")
    .eq("clerk_user_id", userId)

  if (error || !data) {
    return []
  }

  return data
    .map((favorite) => favorite.cafe_id)
    .filter((cafeId): cafeId is string => typeof cafeId === "string")
}

export async function getViewerCafeState(
  cafeId: string
): Promise<ViewerCafeState> {
  const { userId } = await auth()

  if (!userId) {
    return {
      isSignedIn: false,
      isFavorite: false,
      ownReview: null,
      canSubmitReview: false,
      nextReviewAt: null,
    }
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return {
      isSignedIn: true,
      isFavorite: false,
      ownReview: null,
      canSubmitReview: false,
      nextReviewAt: null,
    }
  }

  const [{ data: favorite }, { data: review }] = await Promise.all([
    supabase
      .from("cafe_favorites")
      .select("id")
      .eq("cafe_id", cafeId)
      .eq("clerk_user_id", userId)
      .maybeSingle(),
    supabase
      .from("cafe_reviews")
      .select(
        "id, cafe_id, author_clerk_user_id, rating, body, status, last_submitted_at, created_at, cafe_review_media(id, storage_bucket, storage_path, alt, sort_order)"
      )
      .eq("cafe_id", cafeId)
      .eq("author_clerk_user_id", userId)
      .maybeSingle(),
  ])
  const profilesByUserId = review
    ? await getProfilesByUserId([(review as unknown as ReviewRow).author_clerk_user_id])
    : new Map<string, ProfileRow>()
  const ownReview = review
    ? mapReviewRow(review as unknown as ReviewRow, profilesByUserId)
    : null
  const nextReviewAt = ownReview
    ? new Date(new Date(ownReview.lastSubmittedAt).getTime() + reviewCooldownMs)
    : null
  const canSubmitReview = !nextReviewAt || nextReviewAt.getTime() <= Date.now()

  return {
    isSignedIn: true,
    isFavorite: Boolean(favorite),
    ownReview,
    canSubmitReview,
    nextReviewAt: canSubmitReview ? null : nextReviewAt.toISOString(),
  }
}

export async function getPendingAdminReviews(): Promise<AdminCafeReviewViewModel[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("cafe_reviews")
    .select(
      "id, cafe_id, author_clerk_user_id, rating, body, status, last_submitted_at, created_at, cafes(name, slug), cafe_review_media(id, storage_bucket, storage_path, alt, sort_order)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  const rows = data as unknown as AdminReviewRow[]
  const profilesByUserId = await getProfilesByUserId(
    rows.map((row) => row.author_clerk_user_id)
  )

  return rows.map((row) => {
    const cafe = Array.isArray(row.cafes) ? row.cafes[0] : row.cafes

    return {
      ...mapReviewRow(row, profilesByUserId),
      cafeName: cafe?.name ?? "Local",
      cafeSlug: cafe?.slug ?? "",
    }
  })
}

async function getProfilesByUserId(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]
  const supabase = createSupabaseAdminClient()

  if (!supabase || uniqueUserIds.length === 0) {
    return new Map<string, ProfileRow>()
  }

  const { data } = await supabase
    .from("profiles")
    .select("clerk_user_id, name, image_url")
    .in("clerk_user_id", uniqueUserIds)

  return new Map(
    ((data ?? []) as ProfileRow[]).map((profile) => [
      profile.clerk_user_id,
      profile,
    ])
  )
}

function mapReviewRow(
  row: ReviewRow,
  profilesByUserId: Map<string, ProfileRow>,
  options: {
    viewerCanSeeStatus?: boolean
  } = {}
): CafeReviewViewModel {
  const profile = profilesByUserId.get(row.author_clerk_user_id)

  return {
    id: row.id,
    cafeId: row.cafe_id,
    authorClerkUserId: row.author_clerk_user_id,
    rating: row.rating,
    body: row.body,
    status: row.status,
    lastSubmittedAt: row.last_submitted_at,
    createdAt: row.created_at,
    authorName: profile?.name?.trim() || "Usuario de Coffee Index",
    authorImageUrl: profile?.image_url ?? null,
    viewerCanSeeStatus: Boolean(options.viewerCanSeeStatus),
    media: [...(row.cafe_review_media ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((media) => ({
        id: media.id,
        url: mediaUrl(media),
        alt: media.alt ?? "Foto de la reseña",
        sortOrder: media.sort_order ?? 0,
      })),
  }
}

function mediaUrl(row: ReviewMediaRow) {
  if (row.storage_bucket) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${row.storage_bucket}/${row.storage_path}`
  }

  return row.storage_path.startsWith("/") ? row.storage_path : `/${row.storage_path}`
}
