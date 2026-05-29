import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { EventCard } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getExploreEvents } from "@/lib/data/events"

export default async function ExploreEventsPage() {
  const events = await getExploreEvents()

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Explorar eventos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Descubre actividades de cafeterias fuera de tus favoritos.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/feed" />} variant="outline">
            <ArrowLeftIcon data-icon="inline-start" />
            Feed
          </Button>
        </header>

        {events.length === 0 ? (
          <Card className="rounded-lg border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Todavia no hay eventos para explorar.
            </CardContent>
          </Card>
        ) : (
          events.map((event) => <EventCard event={event} key={event.id} />)
        )}
      </div>
    </main>
  )
}
