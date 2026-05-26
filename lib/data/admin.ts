import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type {
  CafeSubmissionViewModel,
  ClaimRequestViewModel,
  WorkspaceViewModel,
} from "@/lib/types"

export async function getAdminSubmissions(): Promise<CafeSubmissionViewModel[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("cafe_submissions")
    .select(
      "id, requester_clerk_user_id, workspace_id, cafe_id, status, payload, created_at, submission_slug"
    )
    .order("created_at", { ascending: false })

  if (error || !data) {
    handleAdminDataError("Could not load cafe submissions", error)
  }

  return data.map((row) => ({
    id: row.id,
    requesterClerkUserId: row.requester_clerk_user_id,
    workspaceId: row.workspace_id,
    cafeId: row.cafe_id,
    status: row.status,
    payload: row.payload,
    slug: row.submission_slug,
    createdAt: row.created_at,
  }))
}

export async function getAdminClaimRequests(): Promise<ClaimRequestViewModel[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("claim_requests")
    .select(
      "id, workspace_id, requester_clerk_user_id, proof, status, created_at, workspaces(name)"
    )
    .order("created_at", { ascending: false })

  if (error || !data) {
    handleAdminDataError("Could not load claim requests", error)
  }

  return data.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    requesterClerkUserId: row.requester_clerk_user_id,
    proof: row.proof,
    status: row.status,
    createdAt: row.created_at,
    workspaceName: firstRelation(row.workspaces)?.name,
  }))
}

export async function getUserWorkspaces(
  clerkUserId: string
): Promise<WorkspaceViewModel[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("workspace_memberships")
    .select(
      "workspaces(id, clerk_org_id, slug, name, status, verification_status)"
    )
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    handleAdminDataError("Could not load user workspaces", error)
  }

  return data
    .map((row) => firstRelation(row.workspaces))
    .filter((workspace): workspace is NonNullable<typeof workspace> =>
      Boolean(workspace)
    )
    .map((workspace) => ({
      id: workspace.id,
      clerkOrgId: workspace.clerk_org_id,
      slug: workspace.slug,
      name: workspace.name,
      status: workspace.status,
      verificationStatus: workspace.verification_status,
    }))
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function handleAdminDataError(
  message: string,
  error: { message: string } | null
): never {
  if (process.env.NODE_ENV === "development") {
    throw new Error(error ? `${message}: ${error.message}` : message)
  }

  throw new Error("No pudimos cargar los datos administrativos.")
}
