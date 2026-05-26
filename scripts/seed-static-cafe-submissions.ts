import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

import { cafeFeatureLabels, cafes, type Cafe } from "@/lib/cafes"
import { slugify } from "@/lib/slug"
import {
  normalizeInstagramInput,
  normalizeSocialHandle,
} from "@/lib/social-links"
import type { CafeSubmissionPayload } from "@/lib/types"

loadEnvFile(".env.local")
loadEnvFile(".env")

const args = new Set(process.argv.slice(2))
const adminArg = process.argv
  .find((arg) => arg.startsWith("--admin-id="))
  ?.replace("--admin-id=", "")
const dryRun = args.has("--dry-run")
const allowExistingCafes = args.has("--allow-existing-cafes")

const adminGodClerkUserId =
  adminArg ?? process.env.ADMIN_GOD_CLERK_USER_ID ?? process.env.CLERK_ADMIN_USER_ID
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!adminGodClerkUserId) {
  throw new Error(
    "Set ADMIN_GOD_CLERK_USER_ID or pass --admin-id=user_... before seeding submissions."
  )
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding submissions."
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const result = {
  inserted: 0,
  skippedActiveSubmission: 0,
  skippedExistingCafe: 0,
  failed: 0,
}

for (const cafe of cafes) {
  await seedSubmission(cafe)
}

console.info("Seed static cafe submissions complete:", result)

async function seedSubmission(cafe: Cafe) {
  const instagram = normalizeInstagramInput(cafe.instagram)
  const instagramHandle = normalizeSocialHandle(instagram)
  const submissionSlug = cafe.slug || slugify(cafe.name)

  const activeSubmission = await findActiveSubmission(instagramHandle)

  if (activeSubmission) {
    result.skippedActiveSubmission += 1
    console.info(`Skipped ${cafe.name}: active submission already exists.`)
    return
  }

  if (!allowExistingCafes) {
    const existingCafe = await findExistingCafeByInstagram(instagramHandle)

    if (existingCafe) {
      result.skippedExistingCafe += 1
      console.info(`Skipped ${cafe.name}: cafe with same Instagram already exists.`)
      return
    }
  }

  const payload: CafeSubmissionPayload = {
    name: cafe.name,
    commune: cafe.commune,
    addresses: cafe.addresses,
    description: cafe.description,
    hours: "Por confirmar",
    instagram,
    features: cafe.features.map((feature) => cafeFeatureLabels[feature]),
    tags: cafe.tags,
    images: cafe.imagePlaceholders,
  }

  if (dryRun) {
    result.inserted += 1
    console.info(`[dry-run] Would insert ${cafe.name}.`)
    return
  }

  const { error } = await supabase.from("cafe_submissions").insert({
    requester_clerk_user_id: adminGodClerkUserId,
    submission_slug: submissionSlug,
    instagram_handle: instagramHandle,
    status: "pending",
    payload,
  })

  if (error) {
    result.failed += 1
    console.error(`Failed to insert ${cafe.name}:`, error.message)
    return
  }

  result.inserted += 1
  console.info(`Inserted pending submission: ${cafe.name}`)
}

async function findActiveSubmission(instagramHandle: string) {
  const { data, error } = await supabase
    .from("cafe_submissions")
    .select("id")
    .eq("instagram_handle", instagramHandle)
    .in("status", ["pending", "approved", "converted"])
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function findExistingCafeByInstagram(instagramHandle: string) {
  const { data, error } = await supabase
    .from("cafe_social_links")
    .select("id")
    .eq("platform", "instagram")
    .eq("normalized_handle", instagramHandle)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

function loadEnvFile(filename: string) {
  const filepath = resolve(process.cwd(), filename)

  if (!existsSync(filepath)) {
    return
  }

  const file = readFileSync(filepath, "utf8")

  for (const line of file.split("\n")) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf("=")

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "")

    process.env[key] ??= value
  }
}
