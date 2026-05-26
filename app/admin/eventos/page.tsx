import { Card, CardContent } from "@/components/ui/card"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export default async function AdminEventsPage() {
  await requirePlatformAdmin()

  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-medium">Eventos</h2>
      <Card className="rounded-lg border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          La moderación de eventos queda lista a nivel de schema y permisos; la
          vista operativa se conecta cuando existan eventos cargados desde
          workspaces.
        </CardContent>
      </Card>
    </section>
  )
}
