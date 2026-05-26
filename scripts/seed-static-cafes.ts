import { createClient } from "@supabase/supabase-js"

import {
  cafeFeatureLabels,
  cafes,
  instagramUrl,
  type Cafe,
} from "@/lib/cafes"
import { slugify } from "@/lib/slug"
import { normalizeSocialHandle } from "@/lib/social-links"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding."
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

for (const cafe of cafes) {
  await seedCafe(cafe)
}

async function seedCafe(cafe: Cafe) {
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .upsert(
      {
        slug: cafe.slug,
        name: cafe.name,
        type: "cafe",
        status: "seeded",
        verification_status: "unverified",
        created_from: "static_seed",
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single()

  if (workspaceError) {
    throw workspaceError
  }

  const { data: cafeRow, error: cafeError } = await supabase
    .from("cafes")
    .upsert(
      {
        workspace_id: workspace.id,
        slug: cafe.slug,
        name: cafe.name,
        commune: cafe.commune,
        description: cafe.description,
        status: "published",
        published_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single()

  if (cafeError) {
    throw cafeError
  }

  await supabase.from("cafe_locations").delete().eq("cafe_id", cafeRow.id)
  await supabase.from("cafe_media").delete().eq("cafe_id", cafeRow.id)
  await supabase.from("cafe_social_links").delete().eq("cafe_id", cafeRow.id)
  await supabase.from("cafe_features").delete().eq("cafe_id", cafeRow.id)
  await supabase.from("cafe_tags").delete().eq("cafe_id", cafeRow.id)

  await supabase.from("cafe_locations").insert(
    cafe.addresses.map((address, index) => ({
      cafe_id: cafeRow.id,
      address,
      commune: cafe.commune,
      sort_order: index,
    }))
  )

  await supabase.from("cafe_media").insert(
    cafe.imagePlaceholders
      .filter((image) => image.src)
      .map((image, index) => ({
        cafe_id: cafeRow.id,
        storage_path: image.src,
        alt: image.label,
        sort_order: index,
        status: "approved",
      }))
  )

  await supabase.from("cafe_social_links").insert({
    cafe_id: cafeRow.id,
    platform: "instagram",
    url: instagramUrl(cafe.instagram),
    handle: cafe.instagram,
    normalized_handle: normalizeSocialHandle(cafe.instagram),
    label: "Instagram",
  })

  for (const feature of cafe.features) {
    await supabase.from("features").upsert(
      {
        slug: feature,
        label: cafeFeatureLabels[feature],
      },
      { onConflict: "slug" }
    )
    await supabase
      .from("cafe_features")
      .upsert({ cafe_id: cafeRow.id, feature_slug: feature })
  }

  for (const tag of cafe.tags) {
    const slug = slugify(tag)
    await supabase.from("tags").upsert({ slug, name: tag }, { onConflict: "slug" })
    await supabase
      .from("cafe_tags")
      .upsert({ cafe_id: cafeRow.id, tag_slug: slug })
  }
}
