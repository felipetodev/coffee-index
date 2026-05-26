"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireCurrentUserId } from "@/lib/auth/platform-admin"
import { formatSupabaseSetupError } from "@/lib/supabase/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const claimSchema = z.object({
  workspaceId: z.uuid(),
  proof: z.string().trim().min(20),
})

export async function submitClaimRequestAction(formData: FormData) {
  const requesterClerkUserId = await requireCurrentUserId()
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin client is not available.")
  }

  const parsed = claimSchema.parse({
    workspaceId: formData.get("workspaceId"),
    proof: formData.get("proof"),
  })

  const { error } = await supabase.from("claim_requests").insert({
    workspace_id: parsed.workspaceId,
    requester_clerk_user_id: requesterClerkUserId,
    proof: parsed.proof,
    status: "pending",
  })

  if (error) {
    console.log("Error inserting claim request:", error)
    throw new Error(formatSupabaseSetupError(error))
  }

  await supabase
    .from("workspaces")
    .update({ verification_status: "claim_pending" })
    .eq("id", parsed.workspaceId)
    .eq("verification_status", "unverified")

  revalidatePath("/admin/claims")
  redirect("/claim/enviado")
}
