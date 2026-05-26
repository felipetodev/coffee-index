import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { NextRequest } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return new Response("Supabase admin not configured", { status: 500 })
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>

  try {
    event = await verifyWebhook(req)
  } catch {
    return new Response("Verification failed", { status: 400 })
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const email = event.data.email_addresses.find(
      (item) => item.id === event.data.primary_email_address_id
    )?.email_address

    const { error } = await supabase.from("profiles").upsert({
      clerk_user_id: event.data.id,
      email: email ?? event.data.email_addresses[0]?.email_address ?? null,
      name: [event.data.first_name, event.data.last_name]
        .filter(Boolean)
        .join(" "),
      image_url: event.data.image_url ?? null,
    })

    if (error) {
      return webhookError("Could not sync user profile", error)
    }
  }

  if (event.type === "user.deleted" && event.data.id) {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("clerk_user_id", event.data.id)

    if (error) {
      return webhookError("Could not delete user profile", error)
    }
  }

  if (event.type === "organization.created" || event.type === "organization.updated") {
    const { error } = await supabase
      .from("workspaces")
      .update({
        slug: event.data.slug ?? event.data.id,
        name: event.data.name,
      })
      .eq("clerk_org_id", event.data.id)

    if (error) {
      return webhookError("Could not sync organization workspace", error)
    }
  }

  if (event.type === "organization.deleted" && event.data.id) {
    const { error: workspaceError } = await supabase
      .from("workspaces")
      .update({
        status: "archived",
        clerk_org_id: null,
      })
      .eq("clerk_org_id", event.data.id)

    if (workspaceError) {
      return webhookError("Could not archive organization workspace", workspaceError)
    }

    const { error: membershipsError } = await supabase
      .from("workspace_memberships")
      .delete()
      .eq("clerk_org_id", event.data.id)

    if (membershipsError) {
      return webhookError("Could not delete organization memberships", membershipsError)
    }
  }

  if (
    event.type === "organizationMembership.created" ||
    event.type === "organizationMembership.updated"
  ) {
    const workspace = await getWorkspaceByOrgId(event.data.organization.id)

    if (workspace) {
      const { error } = await supabase
        .from("workspace_memberships")
        .upsert({
          workspace_id: workspace.id,
          clerk_org_id: event.data.organization.id,
          clerk_user_id: event.data.public_user_data.user_id,
          role: event.data.role,
        }, { onConflict: "workspace_id,clerk_user_id" })

      if (error) {
        return webhookError("Could not sync organization membership", error)
      }
    }
  }

  if (event.type === "organizationMembership.deleted") {
    const { error } = await supabase
      .from("workspace_memberships")
      .delete()
      .eq("clerk_org_id", event.data.organization.id)
      .eq("clerk_user_id", event.data.public_user_data.user_id)

    if (error) {
      return webhookError("Could not delete organization membership", error)
    }
  }

  return new Response("OK", { status: 200 })
}

async function getWorkspaceByOrgId(clerkOrgId: string) {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return null
  }

  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle()

  return data
}

function webhookError(message: string, error: { message: string }) {
  if (process.env.NODE_ENV === "development") {
    console.error(message, error)
    return Response.json({ error: message, detail: error.message }, { status: 500 })
  }

  return new Response("Webhook sync failed", { status: 500 })
}
