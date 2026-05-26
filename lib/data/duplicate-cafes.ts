import "server-only"

import { normalizeSocialHandle } from "@/lib/social-links"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type CafeDuplicateCheck = {
  instagramHandle: string
  existingCafe: boolean
  activeSubmission: boolean
}

export async function checkCafeDuplicateByInstagram(
  instagram: string,
  options: {
    excludeSubmissionId?: string
  } = {}
): Promise<CafeDuplicateCheck> {
  const instagramHandle = normalizeSocialHandle(instagram)
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return {
      instagramHandle,
      existingCafe: false,
      activeSubmission: false,
    }
  }

  const [
    { data: socialLink },
    { data: submission },
  ] = await Promise.all([
    supabase
      .from("cafe_social_links")
      .select("id")
      .eq("platform", "instagram")
      .eq("normalized_handle", instagramHandle)
      .maybeSingle(),
    getActiveSubmission(instagramHandle, options.excludeSubmissionId),
  ])

  return {
    instagramHandle,
    existingCafe: Boolean(socialLink),
    activeSubmission: Boolean(submission),
  }
}

export function assertNoCafeDuplicate(check: CafeDuplicateCheck) {
  if (check.existingCafe || check.activeSubmission) {
    throw new Error(
      "Ya existe un local o una solicitud activa con ese Instagram."
    )
  }
}

async function getActiveSubmission(
  instagramHandle: string,
  excludeSubmissionId?: string
) {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return { data: null }
  }

  let query = supabase
    .from("cafe_submissions")
    .select("id")
    .eq("instagram_handle", instagramHandle)
    .in("status", ["pending", "approved", "converted"])
    .limit(1)

  if (excludeSubmissionId) {
    query = query.neq("id", excludeSubmissionId)
  }

  return query.maybeSingle()
}
