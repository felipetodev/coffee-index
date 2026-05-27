import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type WorkspaceProfileData = {
  workspace: {
    id: string
    slug: string
    name: string
  }
  cafe: {
    id: string
    slug: string
    name: string
    commune: string
    description: string
    contactEmail: string
    contactPhone: string
    hoursText: string
    instagram: string
    addresses: string[]
    website: string
    tiktok: string
    x: string
    otherSocial: string
    features: string[]
    tags: string[]
  }
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
        commune: string
        description: string
        contact_email: string | null
        contact_phone: string | null
        hours_text: string | null
        cafe_locations: CafeLocationRow[] | null
        cafe_social_links: CafeSocialLinkRow[] | null
        cafe_features: CafeFeatureRow[] | null
        cafe_tags: CafeTagRow[] | null
      }[]
    | null
}

type CafeLocationRow = {
  address: string
  sort_order: number | null
}

type CafeSocialLinkRow = {
  platform: string
  url: string
  handle: string | null
}

type CafeFeatureRow = {
  features: {
    label: string
  } | null
}

type CafeTagRow = {
  tags: {
    name: string
  } | null
}

export async function getWorkspaceProfileData(
  workspaceSlug: string
): Promise<WorkspaceProfileData | null> {
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
        commune,
        description,
        contact_email,
        contact_phone,
        hours_text,
        cafe_locations(address, sort_order),
        cafe_social_links(platform, url, handle),
        cafe_features(features(label)),
        cafe_tags(tags(name))
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

  const socialLinks = cafe.cafe_social_links ?? []

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
      commune: cafe.commune,
      description: cafe.description,
      contactEmail: cafe.contact_email ?? "",
      contactPhone: cafe.contact_phone ?? "",
      hoursText: cafe.hours_text ?? "",
      instagram: socialValue(socialLinks, "instagram"),
      addresses: [...(cafe.cafe_locations ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((location) => location.address),
      website: socialValue(socialLinks, "website"),
      tiktok: socialValue(socialLinks, "tiktok"),
      x: socialValue(socialLinks, "x"),
      otherSocial: socialValue(socialLinks, "other"),
      features: (cafe.cafe_features ?? [])
        .map((item) => item.features?.label)
        .filter((feature): feature is string => Boolean(feature)),
      tags: (cafe.cafe_tags ?? [])
        .map((item) => item.tags?.name)
        .filter((tag): tag is string => Boolean(tag)),
    },
  }
}

function socialValue(rows: CafeSocialLinkRow[], platform: string) {
  const row = rows.find((item) => item.platform === platform)

  return row?.handle ?? row?.url ?? ""
}
