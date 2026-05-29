import "server-only"

import { createPublicSupabaseClient } from "@/lib/supabase/server"
import type {
  CafeFeatureViewModel,
  CafeImage,
  CafeSocialLinkViewModel,
  CafeViewModel,
  VerificationStatus,
} from "@/lib/types"

type CafeLocationRow = {
  address: string
  commune: string | null
  sort_order: number | null
}

type CafeMediaRow = {
  storage_bucket: string | null
  storage_path: string
  alt: string | null
  sort_order: number | null
  status: string
}

type CafeFeatureRow = {
  features: {
    slug: string
    label: string
  } | null
}

type CafeTagRow = {
  tags: {
    name: string
  } | null
}

type CafeSocialLinkRow = {
  platform: string
  url: string
  handle: string | null
  label?: string | null
}

type CafeRow = {
  id: string
  workspace_id: string
  slug: string
  name: string
  commune: string
  description: string
  contact_email: string | null
  contact_phone: string | null
  hours_text: string | null
  status: CafeViewModel["status"]
  workspaces: {
    status: CafeViewModel["workspaceStatus"]
    verification_status: VerificationStatus
  } | null | Array<{
    status: CafeViewModel["workspaceStatus"]
    verification_status: VerificationStatus
  }>
  cafe_locations: CafeLocationRow[] | null
  cafe_media: CafeMediaRow[] | null
  cafe_features: CafeFeatureRow[] | null
  cafe_tags: CafeTagRow[] | null
  cafe_social_links: CafeSocialLinkRow[] | null
}

export async function getPublishedCafes(): Promise<CafeViewModel[]> {
  const supabase = createPublicSupabaseClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("cafes")
    .select(
      `
      id,
      workspace_id,
      slug,
      name,
      commune,
      description,
      contact_email,
      contact_phone,
      hours_text,
      status,
      workspaces(status, verification_status),
      cafe_locations(address, commune, sort_order),
      cafe_media(storage_bucket, storage_path, alt, sort_order, status),
      cafe_features(features(slug, label)),
      cafe_tags(tags(name)),
      cafe_social_links(platform, url, handle, label)
    `
    )
    .eq("status", "published")
    .order("name")

  if (error || !data) {
    return []
  }

  return (data as unknown as CafeRow[]).map(mapCafeRow)
}

export async function getPublishedCafeBySlug(
  slug: string
): Promise<CafeViewModel | null> {
  const supabase = createPublicSupabaseClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("cafes")
    .select(
      `
      id,
      workspace_id,
      slug,
      name,
      commune,
      description,
      contact_email,
      contact_phone,
      hours_text,
      status,
      workspaces(status, verification_status),
      cafe_locations(address, commune, sort_order),
      cafe_media(storage_bucket, storage_path, alt, sort_order, status),
      cafe_features(features(slug, label)),
      cafe_tags(tags(name)),
      cafe_social_links(platform, url, handle, label)
    `
    )
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return mapCafeRow(data as unknown as CafeRow)
}

function mapCafeRow(row: CafeRow): CafeViewModel {
  const workspace = Array.isArray(row.workspaces)
    ? row.workspaces[0]
    : row.workspaces
  const locations = [...(row.cafe_locations ?? [])].sort(sortByOrder)
  const media = [...(row.cafe_media ?? [])].sort(sortByOrder)
  const socialLinks = row.cafe_social_links ?? []
  const instagram = socialLinks.find((link) => link.platform === "instagram")

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    slug: row.slug,
    name: row.name,
    addresses: locations.map((location) => location.address),
    commune: row.commune,
    instagram: instagram?.handle ?? instagram?.url ?? "",
    description: row.description,
    features: mapFeatures(row.cafe_features ?? []),
    tags: (row.cafe_tags ?? [])
      .map((item) => item.tags?.name)
      .filter((tag): tag is string => Boolean(tag)),
    imagePlaceholders: mapMedia(media),
    status: row.status,
    workspaceStatus: workspace?.status,
    verificationStatus: workspace?.verification_status ?? "unverified",
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    hoursText: row.hours_text,
    socialLinks: mapSocialLinks(socialLinks),
  }
}

function mapFeatures(rows: CafeFeatureRow[]): CafeFeatureViewModel[] {
  return rows
    .map((item) => item.features)
    .filter((feature): feature is NonNullable<typeof feature> => Boolean(feature))
    .map((feature) => ({
      slug: feature.slug,
      label: feature.label,
    }))
}

function mapMedia(rows: CafeMediaRow[]): CafeImage[] {
  return rows
    .filter((row) => row.status === "approved")
    .map((row) => ({
      label: row.alt ?? "Foto del local",
      src: mediaUrl(row),
    }))
}

function mediaUrl(row: CafeMediaRow) {
  if (row.storage_bucket) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${row.storage_bucket}/${row.storage_path}`
  }

  return row.storage_path.startsWith("/") ? row.storage_path : `/${row.storage_path}`
}

function mapSocialLinks(rows: CafeSocialLinkRow[]): CafeSocialLinkViewModel[] {
  return rows.map((row) => ({
    platform: row.platform,
    url: row.url,
    handle: row.handle,
    label: row.label,
  }))
}

function sortByOrder(
  a: { sort_order: number | null },
  b: { sort_order: number | null }
) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0)
}
