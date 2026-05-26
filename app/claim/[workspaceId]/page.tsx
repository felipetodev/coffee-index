import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react"

import { submitClaimRequestAction } from "@/app/claim/[workspaceId]/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hasClerkEnv, hasSupabaseAdminEnv } from "@/lib/env"

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const session = hasClerkEnv() ? await auth() : null
  const isSignedIn = Boolean(session?.userId)

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
        <Button
          className="w-fit"
          nativeButton={false}
          render={<Link href="/" />}
          variant="ghost"
          size="sm"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver
        </Button>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon />
              Verificar local
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isSignedIn ? (
              <div className="grid gap-4 text-sm text-muted-foreground">
                <p>Necesitas iniciar sesión para solicitar acceso al local.</p>
                <Button className="w-fit" nativeButton={false} render={<Link href="/sign-in" />}>
                  Entrar
                </Button>
              </div>
            ) : (
              <form action={submitClaimRequestAction} className="grid gap-4">
                <input name="workspaceId" type="hidden" value={workspaceId} />
                <label className="grid gap-2 text-sm font-medium">
                  Prueba de ownership
                  <textarea
                    className="min-h-36 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    name="proof"
                    placeholder="Cuéntanos tu rol, email de contacto y número de teléfono para comunicarnos por WhatsApp para validar tu solicitud."
                    required
                  />
                </label>
                <Button
                  className="w-fit"
                  disabled={!hasSupabaseAdminEnv()}
                  type="submit"
                >
                  Enviar solicitud
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
