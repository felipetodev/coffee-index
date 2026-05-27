import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type WorkspacePhoto = {
  id: string
  alt: string
  sortOrder: number
  url: string
}

export type WorkspacePhotosData = {
  workspace: {
    id: string
    slug: string
    name: string
  }
  cafe: {
    id: string
    slug: string
    name: string
  }
  photos: WorkspacePhoto[]
}

type WorkspaceCafeRow = {
  id: string
  slug: string
  name: string
  cafes:
    | {
        id: string
        slug: string
        name: string
        cafe_media: CafeMediaRow[] | null
      }[]
    | null
}

type CafeMediaRow = {
  id: string
  storage_bucket: string | null
  storage_path: string
  alt: string | null
  sort_order: number | null
}

const cafeMediaBucket = "cafe-media"

export async function getWorkspacePhotosData(
  workspaceSlug: string
): Promise<WorkspacePhotosData | null> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      slug,
      name,
      cafes(
        id,
        slug,
        name,
        cafe_media(id, storage_bucket, storage_path, alt, sort_order)
      )
    `
    )
    .eq("slug", workspaceSlug)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const workspace = data as unknown as WorkspaceCafeRow
  const cafe = workspace.cafes?.[0]

  if (!cafe) {
    return null
  }

  return {
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
    },
    cafe: {
      id: cafe.id,
      slug: cafe.slug,
      name: cafe.name,
    },
    photos: [...(cafe.cafe_media ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((photo) => ({
        id: photo.id,
        alt: photo.alt ?? "",
        sortOrder: photo.sort_order ?? 0,
        url: mediaUrl(photo),
      })),
  }
}

function mediaUrl(row: CafeMediaRow) {
  if (row.storage_bucket) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${row.storage_bucket}/${row.storage_path}`
  }

  return row.storage_path.startsWith("/") ? row.storage_path : `/${row.storage_path}`
}

export { cafeMediaBucket }
