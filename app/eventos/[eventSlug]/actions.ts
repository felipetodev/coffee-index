"use server"

import { revalidatePath } from "next/cache"

import { requireCurrentUserId } from "@/lib/auth/platform-admin"
import { viewerCanManageEvent } from "@/lib/data/events"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export type EventCommentActionState = {
  error?: string
  success?: string
}

export async function addEventCommentAction(
  _previousState: EventCommentActionState,
  formData: FormData
): Promise<EventCommentActionState> {
  try {
    const userId = await requireCurrentUserId()
    const eventId = requireFormValue(formData, "eventId")
    const eventSlug = requireFormValue(formData, "eventSlug")
    const body = requireFormValue(formData, "body")
    const parentId = optionalFormValue(formData, "parentId")
    const isWorkspaceReply = formData.get("isWorkspaceReply") === "true"

    if (body.length > 1200) {
      return { error: "El comentario no puede superar 1200 caracteres." }
    }

    if (isWorkspaceReply) {
      const canManage = await viewerCanManageEvent(eventId, userId)

      if (!canManage) {
        return { error: "No tienes permisos para responder como local." }
      }
    }

    const { error } = await requireSupabaseAdmin()
      .from("event_comments")
      .insert({
        event_id: eventId,
        parent_id: parentId,
        author_clerk_user_id: userId,
        body,
        is_workspace_reply: isWorkspaceReply,
      })

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/eventos/${eventSlug}`)

    return { success: isWorkspaceReply ? "Respuesta publicada." : "Comentario publicado." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

export async function hideEventCommentAction(
  _previousState: EventCommentActionState,
  formData: FormData
): Promise<EventCommentActionState> {
  try {
    const userId = await requireCurrentUserId()
    const eventId = requireFormValue(formData, "eventId")
    const eventSlug = requireFormValue(formData, "eventSlug")
    const commentId = requireFormValue(formData, "commentId")
    const canManage = await viewerCanManageEvent(eventId, userId)

    if (!canManage) {
      return { error: "No tienes permisos para ocultar comentarios." }
    }

    const { error } = await requireSupabaseAdmin()
      .from("event_comments")
      .update({ hidden_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("event_id", eventId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/eventos/${eventSlug}`)

    return { success: "Comentario ocultado." }
  } catch (error) {
    return { error: readableError(error) }
  }
}

function requireSupabaseAdmin() {
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    throw new Error("Supabase admin no esta configurado.")
  }

  return supabase
}

function requireFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Formulario incompleto.")
  }

  return value.trim()
}

function optionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readableError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No pudimos completar la accion."
}
