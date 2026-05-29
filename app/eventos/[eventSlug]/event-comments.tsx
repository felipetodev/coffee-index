"use client"

import { useActionState, useEffect } from "react"
import {
  MessageCircleIcon,
  SendIcon,
  Trash2Icon,
  VerifiedIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  addEventCommentAction,
  hideEventCommentAction,
  type EventCommentActionState,
} from "@/app/eventos/[eventSlug]/actions"
import type { EventCommentViewModel } from "@/lib/data/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const initialState: EventCommentActionState = {}

export function EventComments({
  canManage,
  comments,
  eventId,
  eventSlug,
  cafeName,
  isSignedIn,
}: {
  canManage: boolean
  comments: EventCommentViewModel[]
  eventId: string
  eventSlug: string
  cafeName: string
  isSignedIn: boolean
}) {
  const [state, action, isPending] = useActionState(
    addEventCommentAction,
    initialState
  )

  useToastFromState(state)

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleIcon className="size-4" />
          Comentarios
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {isSignedIn ? (
          <form action={action} className="grid gap-3">
            <input name="eventId" type="hidden" value={eventId} />
            <input name="eventSlug" type="hidden" value={eventSlug} />
            <textarea
              className="min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              name="body"
              placeholder="Comenta o pregunta algo sobre este evento..."
              required
            />
            <Button className="w-fit" disabled={isPending} type="submit">
              <SendIcon data-icon="inline-start" />
              {isPending ? "Publicando..." : "Comentar"}
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Inicia sesion para comentar este evento.
          </div>
        )}

        <div className="grid gap-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavia no hay comentarios.
            </p>
          ) : (
            comments.map((comment) => (
            <CommentThread
              canManage={canManage}
              cafeName={cafeName}
              comment={comment}
              eventId={eventId}
              eventSlug={eventSlug}
                key={comment.id}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CommentThread({
  canManage,
  cafeName,
  comment,
  eventId,
  eventSlug,
}: {
  canManage: boolean
  cafeName: string
  comment: EventCommentViewModel
  eventId: string
  eventSlug: string
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <CommentBubble
        canManage={canManage}
        cafeName={cafeName}
        comment={comment}
        eventId={eventId}
        eventSlug={eventSlug}
      />
      {comment.replies.length > 0 ? (
        <div className="ml-5 grid gap-3 border-l pl-3">
          {comment.replies.map((reply) => (
            <CommentBubble
              canManage={canManage}
              cafeName={cafeName}
              comment={reply}
              eventId={eventId}
              eventSlug={eventSlug}
              key={reply.id}
            />
          ))}
        </div>
      ) : null}
      {canManage ? (
        <ReplyForm eventId={eventId} eventSlug={eventSlug} parentId={comment.id} />
      ) : null}
    </div>
  )
}

function CommentBubble({
  canManage,
  cafeName,
  comment,
  eventId,
  eventSlug,
}: {
  canManage: boolean
  cafeName: string
  comment: EventCommentViewModel
  eventId: string
  eventSlug: string
}) {
  const [state, action, isPending] = useActionState(
    hideEventCommentAction,
    initialState
  )

  useToastFromState(state)

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">
            {comment.isWorkspaceReply ? cafeName : comment.authorName}
          </span>
          {comment.isWorkspaceReply ? (
            <VerifiedIcon className="text-[#3295F6] size-3" />
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatRelative(comment.createdAt)}
          </span>
        </div>
        {canManage ? (
          <form action={action}>
            <input name="eventId" type="hidden" value={eventId} />
            <input name="eventSlug" type="hidden" value={eventSlug} />
            <input name="commentId" type="hidden" value={comment.id} />
            <Button disabled={isPending} size="icon-xs" type="submit" variant="ghost">
              <Trash2Icon />
              <span className="sr-only">Ocultar comentario</span>
            </Button>
          </form>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{comment.body}</p>
    </div>
  )
}

function ReplyForm({
  eventId,
  eventSlug,
  parentId,
}: {
  eventId: string
  eventSlug: string
  parentId: string
}) {
  const [state, action, isPending] = useActionState(
    addEventCommentAction,
    initialState
  )

  useToastFromState(state)

  return (
    <form action={action} className="ml-5 grid gap-2">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <input name="parentId" type="hidden" value={parentId} />
      <input name="isWorkspaceReply" type="hidden" value="true" />
      <textarea
        className="min-h-16 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        name="body"
        placeholder="Responder como local..."
        required
      />
      <Button className="w-fit" disabled={isPending} size="sm" type="submit" variant="outline">
        <SendIcon data-icon="inline-start" />
        Responder
      </Button>
    </form>
  )
}

function useToastFromState(state: EventCommentActionState) {
  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }

    if (state.success) {
      toast.success(state.success)
    }
  }, [state.error, state.success])
}

function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const diffMins = Math.max(1, Math.round(diffMs / 60000))

  if (diffMins < 60) {
    return `hace ${diffMins} min`
  }

  const diffHours = Math.round(diffMins / 60)

  if (diffHours < 24) {
    return `hace ${diffHours} h`
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
  }).format(new Date(value))
}
