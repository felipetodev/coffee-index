import "server-only"

import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"

import { getRequiredEnv, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/env"

export function createPublicSupabaseClient() {
  if (!hasSupabaseEnv()) {
    return null
  }

  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    }
  )
}

export function createSupabaseClientWithToken(token: string | null) {
  if (!hasSupabaseEnv()) {
    return null
  }

  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
      global: token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined,
    }
  )
}

// NOTE: To enable this helper, configure Clerk as a Third-Party Auth provider
// in Supabase so it can verify Clerk-signed session tokens natively:
//
// 1. Clerk Dashboard → "Connect with Supabase" (enables the integration)
// 2. Supabase Dashboard → Authentication → Sign In/Up → Third Party Auth → Add Clerk
//
// No JWT template needed — Clerk's default session token works directly.
// See: https://supabase.com/docs/guides/auth/third-party/clerk
//
// Until then, use createSupabaseAdminClient() + explicit clerk_user_id
// filters for authenticated reads, and createPublicSupabaseClient()
// for public reads.
export async function createAuthenticatedSupabaseClient() {
  if (!hasSupabaseEnv()) {
    return null
  }

  const { getToken } = await auth()
  const token = await getToken()

  if (!token) {
    return null
  }

  return createSupabaseClientWithToken(token)
}

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminEnv()) {
    return null
  }

  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    }
  )
}
