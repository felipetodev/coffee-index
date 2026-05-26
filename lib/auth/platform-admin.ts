import "server-only"

import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function getCurrentClerkUserId() {
  const session = await auth()

  return session.userId
}

export async function requireCurrentUserId() {
  const userId = await getCurrentClerkUserId()

  if (!userId) {
    throw new Error("Debes iniciar sesión para continuar.")
  }

  await syncCurrentUserProfile(userId)

  return userId
}

export async function syncCurrentUserProfile(userId?: string) {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return
  }

  const user = await currentUser()
  const clerkUserId = user?.id ?? userId

  if (!clerkUserId) {
    return
  }

  const primaryEmail = user?.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId
  )

  await supabase.from("profiles").upsert({
    clerk_user_id: clerkUserId,
    email: primaryEmail?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null,
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    image_url: user?.imageUrl ?? null,
  })
}

export async function isPlatformAdmin(userId: string | null) {
  if (!userId) {
    return false
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return false
  }

  const { data, error } = await supabase
    .from("platform_admins")
    .select("clerk_user_id")
    .eq("clerk_user_id", userId)
    .maybeSingle()

  if (error) {
    return false
  }

  return Boolean(data)
}

export async function userHasWorkspaceMembership(userId: string | null) {
  if (!userId) {
    return false
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return false
  }

  const { data, error } = await supabase
    .from("workspace_memberships")
    .select("id")
    .eq("clerk_user_id", userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    return false
  }

  return Boolean(data)
}

export async function canUserAddLocal(userId: string | null) {
  if (!userId) {
    return true
  }

  if (await isPlatformAdmin(userId)) {
    return true
  }

  return !(await userHasWorkspaceMembership(userId))
}

export async function requirePlatformAdmin() {
  const userId = await requireCurrentUserId()
  const allowed = await isPlatformAdmin(userId)

  if (!allowed) {
    throw new Error("No tienes permisos de administración de plataforma.")
  }

  return userId
}

export async function requirePlatformAdminOrRedirect(destination = "/") {
  const userId = await requireCurrentUserId()
  const allowed = await isPlatformAdmin(userId)

  if (!allowed) {
    redirect(destination)
  }

  return userId
}
