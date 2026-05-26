import { Card, CardContent } from "@/components/ui/card"

export function WorkspaceSection({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-medium">{title}</h2>
      <Card className="rounded-lg border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {description} La base de permisos, rutas y schema ya está preparada;
          los formularios específicos se conectan sobre estas secciones.
        </CardContent>
      </Card>
    </section>
  )
}
