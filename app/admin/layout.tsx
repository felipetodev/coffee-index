import Link from "next/link"

import { Button } from "@/components/ui/button"
import { requirePlatformAdminOrRedirect } from "@/lib/auth/platform-admin"

const adminLinks = [
  ["Submissions", "/admin/submissions"],
  ["Claims", "/admin/claims"],
  ["Cafeterías", "/admin/cafeterias"],
  ["Eventos", "/admin/eventos"],
  ["Workspaces", "/admin/workspaces"],
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdminOrRedirect("/")

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Admin</p>
            <h1 className="mt-1 text-3xl font-medium tracking-tight">
              The Coffee Index
            </h1>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {adminLinks.map(([label, href]) => (
              <Button key={href} nativeButton={false} render={<Link href={href} />} variant="outline" size="sm">
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
