import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"

const workspaceLinks = [
  ["Perfil", "perfil"],
  ["Horarios", "horarios"],
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
  const { orgSlug } = await auth()

  if (orgSlug && orgSlug !== workspaceSlug) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Workspace</p>
            <h1 className="mt-1 text-3xl font-medium tracking-tight">
              {workspaceSlug}
            </h1>
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
