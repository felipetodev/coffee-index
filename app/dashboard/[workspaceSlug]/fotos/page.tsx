import { notFound } from "next/navigation"

import { WorkspacePhotosManager } from "@/app/dashboard/[workspaceSlug]/fotos/workspace-photos-manager"
import { Card, CardContent } from "@/components/ui/card"
import { getWorkspacePhotosData } from "./data"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function WorkspacePhotosPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const data = await getWorkspacePhotosData(workspaceSlug)

  if (!data) {
    notFound()
  }

  return (
    <div className="grid gap-4">
      <Card className="rounded-lg border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Las fotos que subas aquí se publican de inmediato en el catálogo.
          Reemplazar o eliminar una imagen también borra el archivo anterior de tu espacio.
        </CardContent>
      </Card>
      <WorkspacePhotosManager
        cafeName={data.cafe.name}
        photos={data.photos}
        workspaceSlug={data.workspace.slug}
      />
    </div>
  )
}
