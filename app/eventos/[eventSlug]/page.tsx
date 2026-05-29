import type { Metadata } from "next"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from "lucide-react"

import { EventComments } from "@/app/eventos/[eventSlug]/event-comments"
import { EventImageCarousel } from "@/app/eventos/[eventSlug]/event-image-carousel"
import { CafeMap } from "@/components/cafe-map"
import { formatEventRange } from "@/components/event-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getPublishedEventBySlug, viewerCanManageEvent } from "@/lib/data/events"
import { siteConfig } from "@/lib/seo"

type EventPageProps = {
  params: Promise<{ eventSlug: string }>
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { eventSlug } = await params
  const event = await getPublishedEventBySlug(eventSlug)

  if (!event) {
    return { title: "Evento no encontrado" }
  }

  return {
    title: event.title,
    description: event.subtitle ?? event.description,
    alternates: {
      canonical: `/eventos/${event.slug}`,
    },
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      title: event.title,
      description: event.subtitle ?? event.description,
      images: event.media[0] ? [{ url: event.media[0].url, alt: event.title }] : [],
    },
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventSlug } = await params
  const event = await getPublishedEventBySlug(eventSlug)

  if (!event) {
    notFound()
  }

  const { userId } = await auth()
  const canManage = userId ? await viewerCanManageEvent(event.id, userId) : false

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Button
          className="w-fit"
          nativeButton={false}
          render={<Link href="/feed" />}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al feed
        </Button>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="grid gap-5">
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={event.isFinished ? "secondary" : "default"}>
                  {event.isFinished ? "Finalizado" : "Activo"}
                </Badge>
                {event.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div>
                <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">
                  {event.title}
                </h1>
                {event.subtitle ? (
                  <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                    {event.subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <EventImageCarousel images={event.media} title={event.title} />

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Detalles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            <EventComments
              canManage={canManage}
              cafeName={event.cafeName}
              comments={event.comments}
              eventId={event.id}
              eventSlug={event.slug}
              isSignedIn={Boolean(userId)}
            />
          </div>

          <Card className="rounded-lg lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>{event.cafeName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2 text-sm text-muted-foreground">
                <span className="flex items-start gap-2">
                  <CalendarClockIcon className="mt-0.5 size-4 shrink-0" />
                  {formatEventRange(event.startsAt, event.endsAt)}
                </span>
                <span className="flex items-start gap-2">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                  {event.address}
                </span>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Ubicación</p>
                <CafeMap
                  addresses={[event.address]}
                  className="mt-4 h-48"
                  name={event.title}
                />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Button
                  nativeButton={false}
                  render={<Link href={`/cafeterias/${event.cafeSlug}`} />}
                  variant="outline"
                >
                  Ver cafeteria
                </Button>
                {event.externalUrl ? (
                  <Button
                    nativeButton={false}
                    render={
                      <a href={event.externalUrl} target="_blank" rel="noreferrer" />
                    }
                  >
                    Link del evento
                    <ExternalLinkIcon data-icon="inline-end" />
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
