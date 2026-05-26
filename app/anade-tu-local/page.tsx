import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ArrowLeftIcon, Building2Icon } from "lucide-react"

import { CafeSubmissionForm } from "@/app/anade-tu-local/cafe-submission-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { canUserAddLocal } from "@/lib/auth/platform-admin"
import { hasClerkEnv, hasSupabaseAdminEnv } from "@/lib/env"

export default async function AddCafePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const params = await searchParams
  const session = hasClerkEnv() ? await auth() : null
  const isSignedIn = Boolean(session?.userId)
  const submitted = params.submitted === "1"

  if (session?.userId && !(await canUserAddLocal(session.userId))) {
    redirect("/")
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Button
          className="w-fit"
          nativeButton={false}
          render={<Link href="/" />}
          variant="ghost"
          size="sm"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al catálogo
        </Button>

        <section className="grid gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2Icon />
              Añade tu local
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              Registra una cafetería en The Coffee Index.
            </h1>
          </div>

          {submitted && (
            <Card className="rounded-lg border-green-500/40 bg-green-500/5">
              <CardContent className="pt-6 text-sm">
                Recibimos tu solicitud. La revisaremos antes de publicarla o
                asociarla a un workspace real y nos pondremos en contacto contigo.
                <span className="block">
                ¡Gracias por ayudar a crecer la comunidad de The Coffee Index! ☕
                </span>
              </CardContent>
            </Card>
          )}

          {!hasSupabaseAdminEnv() && (
            <Card className="rounded-lg border-dashed">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Configura Supabase para habilitar el envío real de locales.
              </CardContent>
            </Card>
          )}

          {!isSignedIn ? (
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Necesitas iniciar sesión</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
                <p>
                  El ingreso requiere cuenta para poder revisar el local,
                  contactarte y crear el workspace si se aprueba.
                </p>
                <Button className="w-fit" nativeButton={false} render={<Link href="/sign-in" />}>
                  Entrar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <CafeSubmissionForm disabled={!hasSupabaseAdminEnv()} />
          )}
        </section>
      </div>
    </main>
  )
}
