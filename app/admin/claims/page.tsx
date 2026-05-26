import { approveClaimAction, rejectClaimAction } from "@/app/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { getAdminClaimRequests } from "@/lib/data/admin"

export default async function AdminClaimsPage() {
  await requirePlatformAdmin()
  const claims = await getAdminClaimRequests()

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-medium">Solicitudes de traspaso</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Valida dueños reales antes de marcar una cafetería como verificada.
        </p>
      </div>
      <div className="grid gap-4">
        {claims.map((claim) => (
          <Card key={claim.id} className="rounded-lg">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{claim.workspaceName ?? claim.workspaceId}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usuario Clerk: {claim.requesterClerkUserId}
                </p>
              </div>
              <Badge variant={claim.status === "pending" ? "default" : "secondary"}>
                {claim.status}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm leading-6 text-muted-foreground">{claim.proof}</p>
              {claim.status === "pending" && (
                <div className="flex gap-2">
                  <form action={approveClaimAction}>
                    <input name="claimId" type="hidden" value={claim.id} />
                    <Button size="sm" type="submit">Aprobar y verificar</Button>
                  </form>
                  <form action={rejectClaimAction}>
                    <input name="claimId" type="hidden" value={claim.id} />
                    <Button size="sm" type="submit" variant="outline">
                      Rechazar
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {claims.length === 0 && (
          <Card className="rounded-lg border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No hay claims todavía.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
