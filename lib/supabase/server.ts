import "server-only"

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
