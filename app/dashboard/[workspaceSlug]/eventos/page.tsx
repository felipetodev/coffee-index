import { notFound } from "next/navigation"

import { WorkspaceEventsManager } from "@/app/dashboard/[workspaceSlug]/eventos/workspace-events-manager"
import { getWorkspaceEventsData } from "@/lib/data/events"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function WorkspaceEventsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const data = await getWorkspaceEventsData(workspaceSlug)

  if (!data) {
    notFound()
  }

  return (
    <WorkspaceEventsManager
      cafeName={data.cafe.name}
      events={data.events}
      workspaceSlug={data.workspace.slug}
    />
  )
}
