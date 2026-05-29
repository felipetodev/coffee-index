"use client"

import { useState } from "react"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Trash2Icon } from "lucide-react"

type SubmissionActionsProps = {
  submissionId: string
  workspaceId?: string | null
  approveAction: ComponentProps<"form">["action"]
  deleteWorkspaceAction: ComponentProps<"form">["action"]
  rejectAction: ComponentProps<"form">["action"]
  showReviewActions?: boolean
}

export function SubmissionActions({
  submissionId,
  workspaceId,
  approveAction,
  deleteWorkspaceAction,
  rejectAction,
  showReviewActions = true,
}: SubmissionActionsProps) {
  const [pendingAction, setPendingAction] = useState<
    "approve" | "reject" | "delete" | null
  >(null)
  const isPending = Boolean(pendingAction)

  return (
    <div className="flex flex-wrap gap-2">
      {showReviewActions && (
        <>
          <form action={approveAction} onSubmit={() => setPendingAction("approve")}>
            <input name="submissionId" type="hidden" value={submissionId} />
            <Button disabled={isPending} size="sm" type="submit">
              {pendingAction === "approve" ? "Aprobando..." : "Aprobar"}
            </Button>
          </form>
          <form action={rejectAction} onSubmit={() => setPendingAction("reject")}>
            <input name="submissionId" type="hidden" value={submissionId} />
            <Button disabled={isPending} size="sm" type="submit" variant="outline">
              {pendingAction === "reject" ? "Rechazando..." : "Rechazar"}
            </Button>
          </form>
        </>
      )}
      {workspaceId && (
        <form
          action={deleteWorkspaceAction}
          onSubmit={(event) => {
            // TODO: use a dialog instead of window.confirm for better UX
            const confirmed = window.confirm(
              "Esto eliminará el workspace en Clerk y la base de datos. ¿Continuar?"
            )

            if (!confirmed) {
              event.preventDefault()
              return
            }

            setPendingAction("delete")
          }}
        >
          <input name="submissionId" type="hidden" value={submissionId} />
          <input name="workspaceId" type="hidden" value={workspaceId} />
          <Button disabled={isPending} size="sm" type="submit" variant="destructive">
            <Trash2Icon data-icon="inline-start" />
            {pendingAction === "delete" ? "Eliminando..." : "Eliminar workspace"}
          </Button>
        </form>
      )}
    </div>
  )
}
