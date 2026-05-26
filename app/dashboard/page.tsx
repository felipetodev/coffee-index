import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Building2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserWorkspaces } from "@/lib/data/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const { userId } = await auth()
  const workspaces = userId ? await getUserWorkspaces(userId) : []

  if (userId && workspaces.length === 0) {
    redirect("/anade-tu-local")
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2Icon />
            Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight">
            Tus workspaces
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="rounded-lg">
              <CardHeader>
                <CardTitle>{workspace.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{workspace.status}</Badge>
                  <Badge variant="secondary">{workspace.verificationStatus}</Badge>
                </div>
                <Button
                  className="w-fit"
                  nativeButton={false}
                  render={<Link href={`/dashboard/${workspace.slug}/perfil`} />}
                  size="sm"
                >
                  Gestionar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
