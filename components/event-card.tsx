import Image from "next/image"
import Link from "next/link"
import {
  CalendarClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MessageCircleIcon,
} from "lucide-react"

import type { EventViewModel } from "@/lib/data/events"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function EventCard({ event }: { event: EventViewModel }) {
  const image = event.media[0]

  return (
    <Card className="rounded-lg pt-0">
      {image ? (
        <div className="relative aspect-video overflow-hidden bg-muted">
          <Image
            alt={image.alt}
            className="h-full w-full object-cover"
            fill
            sizes="(min-width: 1024px) 42rem, 100vw"
            src={image.url}
          />
          {event.isFinished ? (
            <Badge className="absolute left-3 top-3" variant="secondary">
              Finalizado
            </Badge>
          ) : null}
        </div>
      ) : null}
      <CardHeader>
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
        <CardTitle className="text-lg">
          <Link href={`/eventos/${event.slug}`}>{event.title}</Link>
        </CardTitle>
        {event.subtitle ? (
          <p className="text-sm text-muted-foreground">{event.subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {event.description}
        </p>
        <div className="grid gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarClockIcon className="size-4" />
            {formatEventRange(event.startsAt, event.endsAt)}
          </span>
          <span className="flex items-center gap-2">
            <MapPinIcon className="size-4" />
            {event.address || event.cafeName}
          </span>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <MessageCircleIcon className="size-4 shrink-0" />
          <span className="truncate">{event.cafeName}</span>
        </div>
        <div className="flex gap-2">
          {event.externalUrl ? (
            <Button
              nativeButton={false}
              render={
                <a href={event.externalUrl} target="_blank" rel="noreferrer" />
              }
              size="sm"
              variant="outline"
            >
              Link
              <ExternalLinkIcon data-icon="inline-end" />
            </Button>
          ) : null}
          <Button
            nativeButton={false}
            render={<Link href={`/eventos/${event.slug}`} />}
            size="sm"
          >
            Ver evento
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export function formatEventRange(startsAt: string, endsAt: string) {
  const starts = new Date(startsAt)
  const ends = new Date(endsAt)
  const sameDay = starts.toDateString() === ends.toDateString()
  const date = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(starts)
  const time = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  })

  if (sameDay) {
    return `${date}, ${time.format(starts)} - ${time.format(ends)}`
  }

  return `${date} - ${new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(ends)}`
}
