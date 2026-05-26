import { existsSync, readFileSync } from "node:fs"
import { basename, extname, resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

import { cafes, type Cafe, type CafeImage } from "@/lib/cafes"
import { normalizeSocialHandle } from "@/lib/social-links"

loadEnvFile(".env.local")
loadEnvFile(".env")

const args = new Set(process.argv.slice(2))
const dryRun = args.has("--dry-run")
const syncPublishedCafes = args.has("--sync-published-cafes")

const bucket = "cafe-media"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before uploading media."
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const result = {
  uploaded: 0,
  missingLocalFiles: 0,
  updatedSubmissions: 0,
  updatedPublishedCafes: 0,
  failed: 0,
}

for (const cafe of cafes) {
  await uploadCafeMedia(cafe)
}

console.info("Static cafe media upload complete:", result)

async function uploadCafeMedia(cafe: Cafe) {
  const uploadedImages: CafeImage[] = []

  for (const image of cafe.imagePlaceholders) {
    if (!image.src) {
      continue
    }

    const localPath = resolve(process.cwd(), "public", image.src.replace(/^\//, ""))

    if (!existsSync(localPath)) {
      result.missingLocalFiles += 1
      console.warn(`Missing local file for ${cafe.name}: ${image.src}`)
      continue
    }

    const storagePath = `cafes/${cafe.slug}/${basename(image.src)}`
    uploadedImages.push({ label: image.label, src: storagePath })

    if (dryRun) {
      console.info(`[dry-run] Would upload ${image.src} -> ${bucket}/${storagePath}`)
      continue
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, readFileSync(localPath), {
        contentType: contentTypeForPath(localPath),
        upsert: true,
      })

    if (error) {
      result.failed += 1
      console.error(`Failed to upload ${image.src}:`, error.message)
      continue
    }

    result.uploaded += 1
    console.info(`Uploaded ${image.src} -> ${bucket}/${storagePath}`)
  }

  if (uploadedImages.length === 0) {
    return
  }

  await updatePendingSubmissionImages(cafe, uploadedImages)

  if (syncPublishedCafes) {
    await updatePublishedCafeMedia(cafe, uploadedImages)
  }
}

async function updatePendingSubmissionImages(cafe: Cafe, images: CafeImage[]) {
  const instagramHandle = normalizeSocialHandle(cafe.instagram)

  if (dryRun) {
    console.info(`[dry-run] Would update pending submission images for ${cafe.name}`)
    return
  }

  const { data: submission, error: loadError } = await supabase
    .from("cafe_submissions")
    .select("id, payload")
    .eq("instagram_handle", instagramHandle)
    .in("status", ["pending", "approved", "converted"])
    .maybeSingle()

  if (loadError) {
    result.failed += 1
    console.error(`Failed to load pending submission for ${cafe.name}:`, loadError.message)
    return
  }

  if (!submission) {
    return
  }

  const { error: updateError } = await supabase
    .from("cafe_submissions")
    .update({
      payload: {
        ...(submission.payload as Record<string, unknown>),
        images,
      },
    })
    .eq("id", submission.id)

  if (updateError) {
    result.failed += 1
    console.error(`Failed to update pending submission for ${cafe.name}:`, updateError.message)
    return
  }

  result.updatedSubmissions += 1
}

async function updatePublishedCafeMedia(cafe: Cafe, images: CafeImage[]) {
  if (dryRun) {
    console.info(`[dry-run] Would update published cafe media for ${cafe.name}`)
    return
  }

  const instagramHandle = normalizeSocialHandle(cafe.instagram)
  const { data: socialLink, error: cafeError } = await supabase
    .from("cafe_social_links")
    .select("cafes(id)")
    .eq("platform", "instagram")
    .eq("normalized_handle", instagramHandle)
    .maybeSingle()

  if (cafeError) {
    result.failed += 1
    console.error(`Failed to load published cafe ${cafe.name}:`, cafeError.message)
    return
  }

  const cafeRow = Array.isArray(socialLink?.cafes)
    ? socialLink?.cafes[0]
    : socialLink?.cafes

  if (!cafeRow) {
    return
  }

  await supabase.from("cafe_media").delete().eq("cafe_id", cafeRow.id)

  const { error: mediaError } = await supabase.from("cafe_media").insert(
    images.map((image, index) => ({
      cafe_id: cafeRow.id,
      storage_bucket: bucket,
      storage_path: image.src,
      alt: image.label,
      sort_order: index,
      status: "approved",
    }))
  )

  if (mediaError) {
    result.failed += 1
    console.error(`Failed to update cafe_media for ${cafe.name}:`, mediaError.message)
    return
  }

  result.updatedPublishedCafes += 1
}

function contentTypeForPath(path: string) {
  const extension = extname(path).toLowerCase()

  if (extension === ".webp") {
    return "image/webp"
  }

  if (extension === ".png") {
    return "image/png"
  }

  if (extension === ".jpeg" || extension === ".jpg") {
    return "image/jpeg"
  }

  return "application/octet-stream"
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
