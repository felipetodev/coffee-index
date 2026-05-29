import "server-only"

import { auth } from "@clerk/nextjs/server"

import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { logSupabaseError } from "@/lib/supabase/errors"
import {
  createPublicSupabaseClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server"

export const eventMediaBucket = "event-media"

export type EventStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "cancelled"

export type EventMediaViewModel = {
  id: string
  url: string
  alt: string
  sortOrder: number
}

export type EventCommentViewModel = {
  id: string
  parentId: string | null
  authorClerkUserId: string
  authorName: string
  authorImageUrl: string | null
  body: string
  isWorkspaceReply: boolean
  createdAt: string
  replies: EventCommentViewModel[]
}

export type EventViewModel = {
  id: string
  workspaceId: string
  workspaceSlug: string
  cafeId: string
  cafeSlug: string
  cafeName: string
  slug: string
  title: string
  subtitle: string | null
  description: string
  startsAt: string
  endsAt: string
  address: string
  externalUrl: string | null
  status: EventStatus
  createdAt: string
  publishedAt: string | null
  isFinished: boolean
  tags: string[]
  media: EventMediaViewModel[]
  comments: EventCommentViewModel[]
}

export type WorkspaceEventListData = {
  workspace: {
    id: string
    slug: string
    name: string
  }
  cafe: {
    id: string
    slug: string
    name: string
  }
  events: EventViewModel[]
}

export type EventNotificationViewModel = {
  id: string
  eventId: string
  eventSlug: string
  title: string
  cafeName: string
  startsAt: string
  expiresAt: string
  readAt: string | null
}

type EventRow = {
  id: string
  workspace_id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  starts_at: string
  ends_at: string | null
  address: string | null
  external_url: string | null
  status: EventStatus
  created_at: string
  published_at: string | null
  event_media: EventMediaRow[] | null
  event_tags: EventTagRow[] | null
  workspaces:
    | {
        id: string
        slug: string
        name: string
        cafes: CafeRelation[] | null
      }
    | {
        id: string
        slug: string
        name: string
        cafes: CafeRelation[] | null
      }[]
    | null
}

type CafeRelation = {
  id: string
  slug: string
  name: string
}

type EventMediaRow = {
  id: string
  storage_bucket: string | null
  storage_path: string
  alt: string | null
  sort_order: number | null
}

type EventTagRow = {
  tags: {
    name: string
  } | null
}

type EventCommentRow = {
  id: string
  parent_id: string | null
  author_clerk_user_id: string
  body: string
  is_workspace_reply: boolean
  created_at: string
}

type ProfileRow = {
  clerk_user_id: string
  name: string | null
  image_url: string | null
}

type NotificationRow = {
  id: string
  event_id: string
  expires_at: string
  read_at: string | null
  events:
    | {
        slug: string
        title: string
        starts_at: string
        workspaces:
          | {
              cafes: { name: string }[] | null
            }
          | {
              cafes: { name: string }[] | null
            }[]
          | null
      }
    | {
        slug: string
        title: string
        starts_at: string
        workspaces:
          | {
              cafes: { name: string }[] | null
            }
          | {
              cafes: { name: string }[] | null
            }[]
          | null
      }[]
    | null
}

export async function getWorkspaceEventsData(
  workspaceSlug: string
): Promise<WorkspaceEventListData | null> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return null
  }

  const { data: workspaceData, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, name, cafes(id, slug, name)")
    .eq("slug", workspaceSlug)
    .maybeSingle()

  if (workspaceError || !workspaceData) {
    logSupabaseError("getWorkspaceEventsData (workspace)", workspaceError, {
      workspaceSlug,
    })

    return null
  }

  const workspace = workspaceData as unknown as {
    id: string
    slug: string
    name: string
    cafes: CafeRelation[] | null
  }
  const cafe = firstRelation(workspace.cafes)

  if (!cafe) {
    return null
  }

  const { data, error } = await supabase
    .from("events")
    .select(eventSelect)
    .eq("workspace_id", workspace.id)
    .order("starts_at", { ascending: false })
    .order("sort_order", { referencedTable: "event_media", ascending: true })

  if (error || !data) {
    logSupabaseError("getWorkspaceEventsData (events)", error, {
      workspaceId: workspace.id,
    })

    return null
  }

  const events = data as unknown as EventRow[]

  return {
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
    },
    cafe,
    events: events.map(mapEventRow),
  }
}

export async function getPublishedEventBySlug(
  eventSlug: string
): Promise<EventViewModel | null> {
  const supabase = createSupabaseAdminClient() ?? createPublicSupabaseClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("events")
    .select(eventSelect)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .maybeSingle()

  if (error || !data) {
    logSupabaseError("getPublishedEventBySlug", error, { eventSlug })

    return null
  }

  const event = mapEventRow(data as unknown as EventRow)
  event.comments = await getEventComments(event.id)

  return event
}

export async function getActiveEventsForCafe(
  cafeId: string | null | undefined,
  workspaceId: string | null | undefined
): Promise<EventViewModel[]> {
  if (!cafeId && !workspaceId) {
    return []
  }

  const supabase = createSupabaseAdminClient() ?? createPublicSupabaseClient()

  if (!supabase) {
    return []
  }

  let query = supabase
    .from("events")
    .select(eventSelect)
    .eq("status", "published")
    .gt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(3)

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId)
  }

  const { data, error } = await query

  if (error || !data) {
    logSupabaseError("getActiveEventsForCafe", error, { cafeId, workspaceId })

    return []
  }

  return (data as unknown as EventRow[])
    .map(mapEventRow)
    .filter((event) => !cafeId || event.cafeId === cafeId)
}

export async function getAdminEvents(): Promise<EventViewModel[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("events")
    .select(eventSelect)
    .order("starts_at", { ascending: false })
    .limit(12)

  if (error || !data) {
    logSupabaseError("getAdminEvents", error)

    return []
  }

  return (data as unknown as EventRow[]).map(mapEventRow)
}

export async function getFavoriteFeedEvents(): Promise<EventViewModel[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data: favorites } = await supabase
    .from("cafe_favorites")
    .select("cafe_id")
    .eq("clerk_user_id", userId)

  const cafeIds = (favorites ?? [])
    .map((favorite) => favorite.cafe_id)
    .filter((cafeId): cafeId is string => typeof cafeId === "string")

  if (cafeIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("events")
    .select(eventSelect)
    .eq("status", "published")
    .order("starts_at", { ascending: false })
    .limit(60)

  if (error || !data) {
    logSupabaseError("getFavoriteFeedEvents", error, { userId })

    return []
  }

  return (data as unknown as EventRow[])
    .map(mapEventRow)
    .filter((event) => cafeIds.includes(event.cafeId))
}

export async function getExploreEvents(): Promise<EventViewModel[]> {
  const { userId } = await auth()
  const supabase = createSupabaseAdminClient() ?? createPublicSupabaseClient()

  if (!supabase) {
    return []
  }

  const favoriteIds = userId ? await getFavoriteCafeIds(userId) : []
  const { data, error } = await supabase
    .from("events")
    .select(eventSelect)
    .eq("status", "published")
    .order("starts_at", { ascending: false })
    .limit(80)

  if (error || !data) {
    logSupabaseError("getExploreEvents", error, { userId })

    return []
  }

  return (data as unknown as EventRow[])
    .map(mapEventRow)
    .filter((event) => !favoriteIds.includes(event.cafeId))
}

export async function getActiveEventNotifications(
  userId: string
): Promise<EventNotificationViewModel[]> {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { error: deleteError } = await supabase
    .from("event_notifications")
    .delete()
    .eq("recipient_clerk_user_id", userId)
    .lte("expires_at", new Date().toISOString())

  if (deleteError) {
    logSupabaseError("getActiveEventNotifications (cleanup)", deleteError, {
      userId,
    })
  }

  const { data, error } = await supabase
    .from("event_notifications")
    .select(
      "id, event_id, expires_at, read_at, events(slug, title, starts_at, workspaces(cafes(name)))"
    )
    .eq("recipient_clerk_user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(10)

  if (error || !data) {
    logSupabaseError("getActiveEventNotifications", error, { userId })

    return []
  }

  return (data as unknown as NotificationRow[])
    .map((row) => {
      const event = firstRelation(row.events)
      const workspace = firstRelation(event?.workspaces)
      const cafe = firstRelation(workspace?.cafes)

      if (!event) {
        return null
      }

      return {
        id: row.id,
        eventId: row.event_id,
        eventSlug: event.slug,
        title: event.title,
        cafeName: cafe?.name ?? "Cafeteria",
        startsAt: event.starts_at,
        expiresAt: row.expires_at,
        readAt: row.read_at,
      }
    })
    .filter((notification): notification is EventNotificationViewModel =>
      Boolean(notification)
    )
}

export async function viewerCanManageEvent(eventId: string, userId: string) {
  const platformAdmin = await isPlatformAdmin(userId)

  if (platformAdmin) {
    return true
  }

  const session = await auth()
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return false
  }

  const { data } = await supabase
    .from("events")
    .select("workspaces(slug)")
    .eq("id", eventId)
    .maybeSingle()
  const event = data as unknown as {
    workspaces: { slug: string } | { slug: string }[] | null
  } | null
  const workspace = firstRelation(event?.workspaces)

  return workspace?.slug === session.orgSlug && isWorkspaceManagerRole(getCurrentOrgRole(session))
}

export function isWorkspaceManagerRole(role: string) {
  return new Set([
    "org:admin",
    "org:cafe_owner",
    "org:cafe_admin",
    "org:cafe_events:create",
    "org:cafe_events:approve",
  ]).has(role)
}

async function getFavoriteCafeIds(userId: string) {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return []
  }

  const { data } = await supabase
    .from("cafe_favorites")
    .select("cafe_id")
    .eq("clerk_user_id", userId)

  return (data ?? [])
    .map((favorite) => favorite.cafe_id)
    .filter((cafeId): cafeId is string => typeof cafeId === "string")
}

async function getEventComments(eventId: string) {
  const supabase = createSupabaseAdminClient() ?? createPublicSupabaseClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("event_comments")
    .select("id, parent_id, author_clerk_user_id, body, is_workspace_reply, created_at")
    .eq("event_id", eventId)
    .is("hidden_at", null)
    .order("created_at", { ascending: true })

  if (error || !data) {
    logSupabaseError("getEventComments", error, { eventId })

    return []
  }

  const rows = data as unknown as EventCommentRow[]
  const profiles = await getProfilesByUserId(rows.map((row) => row.author_clerk_user_id))
  const mapped = rows.map((row) => mapCommentRow(row, profiles))
  const byParent = new Map<string | null, EventCommentViewModel[]>()

  for (const comment of mapped) {
    const list = byParent.get(comment.parentId) ?? []
    list.push(comment)
    byParent.set(comment.parentId, list)
  }

  return (byParent.get(null) ?? []).map((comment) => ({
    ...comment,
    replies: byParent.get(comment.id) ?? [],
  }))
}

async function getProfilesByUserId(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean)
  const supabase = createSupabaseAdminClient()

  if (!supabase || uniqueUserIds.length === 0) {
    return new Map<string, ProfileRow>()
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("clerk_user_id, name, image_url")
    .in("clerk_user_id", uniqueUserIds)

  if (error || !data) {
    logSupabaseError("getProfilesByUserId", error, { userIds: uniqueUserIds })

    return new Map<string, ProfileRow>()
  }

  return new Map(
    (data as ProfileRow[]).map((profile) => [profile.clerk_user_id, profile])
  )
}

function mapEventRow(row: EventRow): EventViewModel {
  const workspace = firstRelation(row.workspaces)
  const cafe = firstRelation(workspace?.cafes)
  const endsAt = row.ends_at ?? row.starts_at

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceSlug: workspace?.slug ?? "",
    cafeId: cafe?.id ?? "",
    cafeSlug: cafe?.slug ?? "",
    cafeName: cafe?.name ?? "Cafeteria",
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description ?? "",
    startsAt: row.starts_at,
    endsAt,
    address: row.address ?? "",
    externalUrl: row.external_url,
    status: row.status,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    isFinished: new Date(endsAt).getTime() < Date.now(),
    tags: (row.event_tags ?? [])
      .map((item) => item.tags?.name)
      .filter((tag): tag is string => Boolean(tag)),
    media: (row.event_media ?? [])
      .map(mapMediaRow)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    comments: [],
  }
}

function mapMediaRow(row: EventMediaRow): EventMediaViewModel {
  const bucket = row.storage_bucket ?? eventMediaBucket
  const supabase = createPublicSupabaseClient() ?? createSupabaseAdminClient()
  const { data } = supabase?.storage.from(bucket).getPublicUrl(row.storage_path) ?? {
    data: { publicUrl: row.storage_path },
  }

  return {
    id: row.id,
    url: data.publicUrl,
    alt: row.alt ?? "Imagen del evento",
    sortOrder: row.sort_order ?? 0,
  }
}

function mapCommentRow(
  row: EventCommentRow,
  profiles: Map<string, ProfileRow>
): EventCommentViewModel {
  const profile = profiles.get(row.author_clerk_user_id)

  return {
    id: row.id,
    parentId: row.parent_id,
    authorClerkUserId: row.author_clerk_user_id,
    authorName: profile?.name ?? "Usuario",
    authorImageUrl: profile?.image_url ?? null,
    body: row.body,
    isWorkspaceReply: row.is_workspace_reply,
    createdAt: row.created_at,
    replies: [],
  }
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getCurrentOrgRole(session: Awaited<ReturnType<typeof auth>>) {
  const claims = session.sessionClaims as Record<string, unknown> | null | undefined
  const claimRole = claims?.org_role

  if (typeof claimRole === "string") {
    return claimRole
  }

  const sessionWithRole = session as typeof session & { orgRole?: unknown }

  return typeof sessionWithRole.orgRole === "string" ? sessionWithRole.orgRole : ""
}

const eventSelect = `
  id,
  workspace_id,
  slug,
  title,
  subtitle,
  description,
  starts_at,
  ends_at,
  address,
  external_url,
  status,
  created_at,
  published_at,
  event_media(id, storage_bucket, storage_path, alt, sort_order),
  event_tags(tags(name)),
  workspaces(id, slug, name, cafes(id, slug, name))
`
