"use server"

import { requireCurrentUserId } from "@/lib/auth/platform-admin"
import { getActiveEventNotifications } from "@/lib/data/events"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function getEventNotificationsAction() {
  const userId = await requireCurrentUserId()

  return getActiveEventNotifications(userId)
}

export async function markEventNotificationsReadAction(notificationIds: string[]) {
  const userId = await requireCurrentUserId()
  const ids = notificationIds.filter(Boolean)

  if (ids.length === 0) {
    return
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return
  }

  await supabase
    .from("event_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_clerk_user_id", userId)
    .in("id", ids)
}
