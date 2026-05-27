"use server"

import { revalidatePath } from "next/cache"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import {
  createCafeOrganization,
  deleteCafeOrganization,
  upsertCafeOrganizationMembership,
} from "@/lib/clerk/organizations"
import {
  assertNoCafeDuplicate,
  checkCafeDuplicateByInstagram,
} from "@/lib/data/duplicate-cafes"
import { sendTransactionalEmail } from "@/lib/email"
import { slugify } from "@/lib/slug"
import { createSocialLinkRows } from "@/lib/social-links"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type { CafeSubmissionPayload } from "@/lib/types"

export async function approveSubmissionAction(formData: FormData) {
  const actorClerkUserId = await requirePlatformAdmin()
  const submissionId = String(formData.get("submissionId") ?? "").trim()
  const supabase = requireSupabaseAdmin()

  if (!submissionId) {
    throw new Error("No submissionId provided.")
  }

  const { data: submission, error: submissionError } = await supabase
    .from("cafe_submissions")
    .select("id, requester_clerk_user_id, payload, status")
    .eq("id", submissionId)
    .maybeSingle()

  if (submissionError) {
    throw new Error(`Failed to load submission: ${submissionError.message}`)
  }

  if (!submission) {
    throw new Error("Submission not found.")
  }

  const payload = submission.payload as CafeSubmissionPayload

  const baseSlug = slugify(payload.name)
  assertNoCafeDuplicate(
    await checkCafeDuplicateByInstagram(payload.instagram, {
      excludeSubmissionId: submission.id,
    })
  )
  const publicSlug = await getApprovalSlug(baseSlug)

  const clerkOrgId = await createCafeOrganization({
    name: payload.name,
    slug: publicSlug,
    creatorClerkUserId: submission.requester_clerk_user_id,
  }).catch((error) => {
    console.error("Error creating Clerk organization:", error)
    throw new Error("Failed to create organization in Clerk.")
  })

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .upsert({
      clerk_org_id: clerkOrgId,
      slug: publicSlug,
      name: payload.name,
      type: "cafe",
      status: "active",
      verification_status: "unverified",
      created_from: "user_submission",
    }, { onConflict: "slug" })
    .select("id")
    .single()

  if (workspaceError) {
    throw new Error(workspaceError.message)
  }

  const { data: cafe, error: cafeError } = await supabase
    .from("cafes")
    .upsert({
      workspace_id: workspace.id,
      slug: publicSlug,
      name: payload.name,
      commune: payload.commune,
      description: payload.description,
      contact_email: payload.contactEmail ?? null,
      contact_phone: payload.contactPhone ?? null,
      hours_text: normalizeSubmissionHours(payload.hours),
      status: "published",
      published_at: new Date().toISOString(),
    }, { onConflict: "slug" })
    .select("id")
    .single()

  if (cafeError) {
    throw new Error(cafeError.message)
  }

  await cleanupCafeDetails(cafe.id)

  await Promise.all([
    insertLocations(cafe.id, payload.addresses, payload.commune),
    insertTags(cafe.id, payload.tags),
    insertFeatures(cafe.id, payload.features),
    insertMedia(cafe.id, payload.images ?? []),
    insertSocialLinks(cafe.id, payload),
    supabase
      .from("workspace_memberships")
      .upsert({
        workspace_id: workspace.id,
        clerk_org_id: clerkOrgId,
        clerk_user_id: submission.requester_clerk_user_id,
        role: "org:admin", // previous "org:cafe_owner" failed with 403, does not exist in Clerk roles.
      }, { onConflict: "workspace_id,clerk_user_id" }),
  ])

  await supabase
    .from("cafe_submissions")
    .update({
      status: "converted",
      workspace_id: workspace.id,
      cafe_id: cafe.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId)

  await writeAuditLog(actorClerkUserId, "submission.approved", "cafe_submission", {
    submissionId,
    workspaceId: workspace.id,
    cafeId: cafe.id,
    slug: publicSlug,
  })

  if (payload.contactEmail) {
    await sendTransactionalEmail({
      to: payload.contactEmail,
      subject: "Tu local fue aprobado en The Coffee Index",
      html: `<p>${payload.name} ya fue aprobado. Creamos un workspace para que puedas administrarlo.</p>`,
    })
  }

  revalidatePath("/")
  revalidatePath("/admin/submissions")
}

export async function rejectSubmissionAction(formData: FormData) {
  const actorClerkUserId = await requirePlatformAdmin()
  const submissionId = String(formData.get("submissionId") ?? "")
  const supabase = requireSupabaseAdmin()

  await supabase
    .from("cafe_submissions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", submissionId)

  await writeAuditLog(actorClerkUserId, "submission.rejected", "cafe_submission", {
    submissionId,
  })

  revalidatePath("/admin/submissions")
}

export async function deleteSubmissionWorkspaceAction(formData: FormData) {
  const actorClerkUserId = await requirePlatformAdmin()
  const submissionId = String(formData.get("submissionId") ?? "").trim()
  const workspaceId = String(formData.get("workspaceId") ?? "").trim()
  const supabase = requireSupabaseAdmin()

  if (!submissionId || !workspaceId) {
    throw new Error("No submissionId or workspaceId provided.")
  }

  const { data: submission, error: submissionError } = await supabase
    .from("cafe_submissions")
    .select("id, workspace_id, cafe_id, status")
    .eq("id", submissionId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (submissionError) {
    throw new Error(`Failed to load submission: ${submissionError.message}`)
  }

  if (!submission) {
    throw new Error("Submission workspace not found.")
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, clerk_org_id, slug, name")
    .eq("id", workspaceId)
    .maybeSingle()

  if (workspaceError) {
    throw new Error(`Failed to load workspace: ${workspaceError.message}`)
  }

  if (!workspace) {
    throw new Error("Workspace not found.")
  }

  await deleteCafeOrganization(workspace.clerk_org_id)

  const { error: deleteWorkspaceError } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspace.id)

  if (deleteWorkspaceError) {
    throw new Error(deleteWorkspaceError.message)
  }

  await supabase
    .from("cafe_submissions")
    .update({
      workspace_id: null,
      cafe_id: null,
      status: submission.status === "converted" ? "rejected" : submission.status,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId)

  await writeAuditLog(actorClerkUserId, "workspace.deleted", "workspace", {
    submissionId,
    workspaceId: workspace.id,
    cafeId: submission.cafe_id,
    clerkOrgId: workspace.clerk_org_id,
    slug: workspace.slug,
    name: workspace.name,
  })

  revalidatePath("/")
  revalidatePath("/admin/submissions")
}

export async function approveClaimAction(formData: FormData) {
  const actorClerkUserId = await requirePlatformAdmin()
  const claimId = String(formData.get("claimId") ?? "")
  const supabase = requireSupabaseAdmin()

  const { data: claim, error } = await supabase
    .from("claim_requests")
    .select("id, workspace_id, requester_clerk_user_id, workspaces(id, slug, name, clerk_org_id)")
    .eq("id", claimId)
    .maybeSingle()

  if (error || !claim || !claim.workspaces) {
    throw new Error("Claim no encontrado.")
  }

  const workspace = Array.isArray(claim.workspaces)
    ? claim.workspaces[0]
    : claim.workspaces

  if (!workspace?.clerk_org_id) {
    throw new Error("Workspace no encontrado.")
  }

  const clerkOrgId = workspace.clerk_org_id

  await upsertCafeOrganizationMembership({
    clerkOrgId,
    clerkUserId: claim.requester_clerk_user_id,
    role: "org:admin", // previous "org:cafe_owner" failed with 403, does not exist in Clerk roles.
  })

  await Promise.all([
    supabase
      .from("workspaces")
      .update({
        clerk_org_id: clerkOrgId,
        status: "active",
        verification_status: "verified",
        transferred_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      })
      .eq("id", workspace.id),
    supabase
      .from("workspace_memberships")
      .upsert({
        workspace_id: workspace.id,
        clerk_org_id: clerkOrgId,
        clerk_user_id: claim.requester_clerk_user_id,
        role: "org:admin", // previous "org:cafe_owner" failed with 403, does not exist in Clerk roles.
      }, { onConflict: "workspace_id,clerk_user_id" }),
    supabase
      .from("claim_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", claimId),
  ])

  await writeAuditLog(actorClerkUserId, "claim.approved", "claim_request", {
    claimId,
    workspaceId: workspace.id,
  })

  revalidatePath("/")
  revalidatePath("/admin/claims")
}

export async function rejectClaimAction(formData: FormData) {
  const actorClerkUserId = await requirePlatformAdmin()
  const claimId = String(formData.get("claimId") ?? "")
  const supabase = requireSupabaseAdmin()

  await supabase
    .from("claim_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", claimId)

  await writeAuditLog(actorClerkUserId, "claim.rejected", "claim_request", {
    claimId,
  })

  revalidatePath("/admin/claims")
}

export async function approveReviewAction(formData: FormData) {
  const actorClerkUserId = await requirePlatformAdmin()
  const reviewId = String(formData.get("reviewId") ?? "").trim()
  const supabase = requireSupabaseAdmin()

  if (!reviewId) {
    throw new Error("No reviewId provided.")
  }

  const { data: review, error: reviewError } = await supabase
    .from("cafe_reviews")
    .select("id, cafe_id, cafes(slug)")
    .eq("id", reviewId)
    .maybeSingle()

  if (reviewError || !review) {
    throw new Error("Review no encontrada.")
  }

  const { error } = await supabase
    .from("cafe_reviews")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)

  if (error) {
    throw new Error(error.message)
  }

  const cafe = Array.isArray(review.cafes) ? review.cafes[0] : review.cafes

  await writeAuditLog(actorClerkUserId, "review.approved", "cafe_review", {
    reviewId,
    cafeId: review.cafe_id,
  })

  revalidatePath("/admin/reviews")

  if (cafe?.slug) {
    revalidatePath(`/cafeterias/${cafe.slug}`)
  }
}

export async function rejectReviewAction(formData: FormData) {
  const actorClerkUserId = await requirePlatformAdmin()
  const reviewId = String(formData.get("reviewId") ?? "").trim()
  const supabase = requireSupabaseAdmin()

  if (!reviewId) {
    throw new Error("No reviewId provided.")
  }

  const { data: review, error: reviewError } = await supabase
    .from("cafe_reviews")
    .select("id, cafe_id, cafes(slug)")
    .eq("id", reviewId)
    .maybeSingle()

  if (reviewError || !review) {
    throw new Error("Review no encontrada.")
  }

  const { error } = await supabase
    .from("cafe_reviews")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)

  if (error) {
    throw new Error(error.message)
  }

  const cafe = Array.isArray(review.cafes) ? review.cafes[0] : review.cafes

  await writeAuditLog(actorClerkUserId, "review.rejected", "cafe_review", {
    reviewId,
    cafeId: review.cafe_id,
  })

  revalidatePath("/admin/reviews")

  if (cafe?.slug) {
    revalidatePath(`/cafeterias/${cafe.slug}`)
  }
}

function requireSupabaseAdmin() {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin no está configurado.")
  }

  return supabase
}

async function cleanupCafeDetails(cafeId: string) {
  const supabase = requireSupabaseAdmin()

  await Promise.all([
    supabase.from("cafe_locations").delete().eq("cafe_id", cafeId),
    supabase.from("cafe_features").delete().eq("cafe_id", cafeId),
    supabase.from("cafe_tags").delete().eq("cafe_id", cafeId),
    supabase.from("cafe_social_links").delete().eq("cafe_id", cafeId),
  ])
}

async function getApprovalSlug(baseSlug: string) {
  const supabase = requireSupabaseAdmin()

  const { data: existingCafe } = await supabase
    .from("cafes")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle()

  if (!existingCafe) {
    return baseSlug
  }

  for (let suffix = 2; suffix <= 100; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`
    const [{ data: cafe }, { data: workspace }] = await Promise.all([
      supabase.from("cafes").select("id").eq("slug", candidate).maybeSingle(),
      supabase.from("workspaces").select("id").eq("slug", candidate).maybeSingle(),
    ])

    if (!cafe && !workspace) {
      return candidate
    }
  }

  throw new Error("No se pudo generar un slug disponible para este local.")
}

async function insertLocations(cafeId: string, addresses: string[], commune: string) {
  const supabase = requireSupabaseAdmin()

  if (addresses.length === 0) {
    return
  }

  await supabase.from("cafe_locations").insert(
    addresses.map((address, index) => ({
      cafe_id: cafeId,
      address,
      commune,
      sort_order: index,
    }))
  )
}

function normalizeSubmissionHours(hours: string | undefined) {
  const note = hours?.trim()

  return note || null
}

async function insertTags(cafeId: string, tags: string[]) {
  const supabase = requireSupabaseAdmin()

  for (const tag of tags) {
    const slug = slugify(tag)
    await supabase.from("tags").upsert({ slug, name: tag }, { onConflict: "slug" })
    await supabase.from("cafe_tags").upsert({ cafe_id: cafeId, tag_slug: slug })
  }
}

async function insertFeatures(cafeId: string, features: string[]) {
  const supabase = requireSupabaseAdmin()

  for (const feature of features) {
    const slug = slugify(feature)

    await supabase
      .from("features")
      .upsert({ slug, label: feature }, { onConflict: "slug" })
    await supabase
      .from("cafe_features")
      .upsert({ cafe_id: cafeId, feature_slug: slug })
  }
}

async function insertMedia(cafeId: string, images: NonNullable<CafeSubmissionPayload["images"]>) {
  const supabase = requireSupabaseAdmin()

  if (images.length === 0) {
    return
  }

  await supabase.from("cafe_media").insert(
    images
      .filter((image) => image.src)
      .map((image, index) => ({
        cafe_id: cafeId,
        storage_bucket: image.src?.startsWith("/") ? null : "cafe-media",
        storage_path: image.src,
        alt: image.label,
        sort_order: index,
        status: "approved",
      }))
  )
}

async function insertSocialLinks(cafeId: string, payload: CafeSubmissionPayload) {
  const supabase = requireSupabaseAdmin()

  await supabase.from("cafe_social_links").insert(createSocialLinkRows(cafeId, payload))
}

async function writeAuditLog(
  actorClerkUserId: string,
  action: string,
  resourceType: string,
  metadata: Record<string, unknown>
) {
  const supabase = requireSupabaseAdmin()

  await supabase.from("audit_logs").insert({
    actor_clerk_user_id: actorClerkUserId,
    action,
    resource_type: resourceType,
    metadata,
  })
}
