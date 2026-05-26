import Link from "next/link"
import { SignIn } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import { hasClerkEnv } from "@/lib/env"

export default function SignInPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      {hasClerkEnv() ? (
        <SignIn routing="path" path="/sign-in" />
      ) : (
        <div className="max-w-md rounded-lg border p-6 text-center">
          <h1 className="text-xl font-medium">Clerk no está configurado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Agrega las variables de entorno de Clerk para habilitar el login.
          </p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/" />}>
            Volver al catálogo
          </Button>
        </div>
      )}
    </main>
  )
}
