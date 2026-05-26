import {
  approveSubmissionAction,
  deleteSubmissionWorkspaceAction,
  rejectSubmissionAction,
} from "@/app/admin/actions"
import { SubmissionActions } from "@/app/admin/submissions/submission-actions"
import { ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminSubmissions } from "@/lib/data/admin"

export default async function AdminSubmissionsPage() {
  const submissions = await getAdminSubmissions()

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-medium">Locales enviados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa solicitudes autenticadas antes de convertirlas en workspace.
        </p>
      </div>
      <div className="grid gap-4">
        {submissions.map((submission) => (
          <Card key={submission.id} className="rounded-lg">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{submission.payload.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {submission.payload.commune}
                  {submission.payload.contactEmail
                    ? ` · ${submission.payload.contactEmail}`
                    : ""}
                </p>
              </div>
              <Badge variant={submission.status === "pending" ? "default" : "secondary"}>
                {submission.status}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {submission.payload.description}
              </p>
              <div className="text-sm">
                <p className="font-medium">Direcciones</p>
                <p className="mt-1 text-muted-foreground">
                  {submission.payload.addresses.join(" · ")}
                </p>
              </div>
              <div className="text-sm">
                <p className="font-medium">Instagram</p>
                <Button
                  className="mt-2"
                  nativeButton={false}
                  render={
                    <a
                      href={submissionInstagramUrl(submission.payload.instagram)}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  variant="outline"
                  size="sm"
                >
                  {submission.payload.instagram}
                  <ExternalLinkIcon data-icon="inline-end" />
                </Button>
              </div>
              {submission.status === "pending" && (
                <SubmissionActions
                  submissionId={submission.id}
                  workspaceId={submission.workspaceId}
                  approveAction={approveSubmissionAction}
                  deleteWorkspaceAction={deleteSubmissionWorkspaceAction}
                  rejectAction={rejectSubmissionAction}
                />
              )}
              {submission.status !== "pending" && submission.workspaceId && (
                <SubmissionActions
                  submissionId={submission.id}
                  workspaceId={submission.workspaceId}
                  approveAction={approveSubmissionAction}
                  deleteWorkspaceAction={deleteSubmissionWorkspaceAction}
                  rejectAction={rejectSubmissionAction}
                  showReviewActions={false}
                />
              )}
            </CardContent>
          </Card>
        ))}
        {submissions.length === 0 && (
          <Card className="rounded-lg border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No hay submissions todavía.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}

function submissionInstagramUrl(value: string) {
  if (value.startsWith("http")) {
    return value
  }

  return `https://instagram.com/${value.replace("@", "")}`
}
