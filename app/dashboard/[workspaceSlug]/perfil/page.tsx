import { notFound } from "next/navigation"

import { WorkspaceProfileForm } from "@/app/dashboard/[workspaceSlug]/perfil/workspace-profile-form"
import { getWorkspaceProfileData } from "./data"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function WorkspaceProfilePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const data = await getWorkspaceProfileData(workspaceSlug)

  if (!data) {
    notFound()
  }

  return <WorkspaceProfileForm data={data} />
}
