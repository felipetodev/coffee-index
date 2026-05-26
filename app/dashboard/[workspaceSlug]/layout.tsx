import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { ExternalLinkIcon } from "lucide-react"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"

const workspaceLinks = [
  ["Perfil", "perfil"],
  ["Fotos", "fotos"],
  ["Eventos", "eventos"],
  ["Equipo", "equipo"],
] as const

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const { orgSlug, userId } = await auth()
  const platformAdmin = await isPlatformAdmin(userId)

  if (!platformAdmin && orgSlug !== workspaceSlug) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Workspace</p>
            <div className="mt-1 flex items-baseline gap-2">
              <h1 className="text-3xl font-medium tracking-tight">
                {workspaceSlug}
              </h1>
              <Button
                aria-label="Ver ficha pública"
                nativeButton={false}
                render={<Link href={`/cafeterias/${workspaceSlug}`} />}
                size="icon-sm"
                variant="ghost"
              >
                <ExternalLinkIcon className="size-3.5" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {workspaceLinks.map(([label, segment]) => (
              <Button
                key={segment}
                nativeButton={false}
                render={<Link href={`/dashboard/${workspaceSlug}/${segment}`} />}
                variant="outline"
                size="sm"
              >
                {label}
              </Button>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  )
}
