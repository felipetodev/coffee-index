import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { CompassIcon, HeartIcon } from "lucide-react"

import { EventCard } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getFavoriteFeedEvents } from "@/lib/data/events"

export default async function FeedPage() {
  const { userId } = await auth()
  const events = await getFavoriteFeedEvents()

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Feed</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Eventos de tus cafeterias favoritas.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href="/feed/explorar" />}
            variant="outline"
          >
            <CompassIcon data-icon="inline-start" />
            Explorar
          </Button>
        </header>

        {!userId ? (
          <Card className="rounded-lg border-dashed">
            <CardContent className="grid gap-3 py-8 text-center">
              <HeartIcon className="mx-auto size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Inicia sesion para ver tu feed.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tambien puedes descubrir eventos publicos en explorar.
                </p>
              </div>
              <Button
                className="mx-auto"
                nativeButton={false}
                render={<Link href="/feed/explorar" />}
                variant="outline"
              >
                Ir a explorar
              </Button>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card className="rounded-lg border-dashed">
            <CardContent className="grid gap-3 py-8 text-center">
              <HeartIcon className="mx-auto size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No hay eventos en tus favoritos.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guarda cafeterias o explora otros eventos para encontrar algo nuevo.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => <EventCard event={event} key={event.id} />)
        )}
      </div>
    </main>
  )
}
