import { Card, CardContent } from "@/components/ui/card"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export default async function AdminWorkspacesPage() {
  await requirePlatformAdmin()

  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-medium">Workspaces</h2>
      <Card className="rounded-lg border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Los workspaces se crean desde seeds, submissions aprobadas y claims.
          Esta vista queda reservada para filtros avanzados y suspensión.
        </CardContent>
      </Card>
    </section>
  )
}
