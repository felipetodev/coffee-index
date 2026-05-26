import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function ClaimSubmittedPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4">
      <div className="max-w-md rounded-lg border p-6 text-center">
        <h1 className="text-xl font-medium">Solicitud recibida</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisaremos la información y te contactaremos para transferir el
          workspace si todo está correcto.
        </p>
        <Button className="mt-4" nativeButton={false} render={<Link href="/" />}>
          Volver al catálogo
        </Button>
      </div>
    </main>
  )
}
