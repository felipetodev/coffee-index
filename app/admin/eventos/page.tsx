import Link from "next/link"
import {
  CalendarClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  Trash2Icon,
} from "lucide-react"

import { deleteAdminEventAction } from "@/app/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { getAdminEvents } from "@/lib/data/events"

export default async function AdminEventsPage() {
  await requirePlatformAdmin()
  const events = await getAdminEvents()

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-medium">Eventos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa todos los eventos creados desde workspaces y elimina entradas si es necesario.
        </p>
      </div>
      <div className="grid gap-4">
        {events.map((event) => (
          <Card className="rounded-lg" key={event.id}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={event.status === "published" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                  {event.isFinished ? <Badge variant="secondary">Finalizado</Badge> : null}
                </div>
                <div className="mt-2">
                  <Button
                    aria-label="Ver ficha pública"
                    nativeButton={false}
                    render={<Link className="w-full space-x-1.5" href={`/eventos/${event.slug}`} />}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <CardTitle>{event.title}</CardTitle>
                    <ExternalLinkIcon className="size-3.5" data-icon="inline-end" />
                  </Button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.subtitle}
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground text-pretty">
                {event.description}
              </p>
              <div className="grid gap-2 text-xs md:text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CalendarClockIcon className="size-4" />
                  {formatDate(event.startsAt)} - {formatDate(event.endsAt)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPinIcon className="size-4" />
                  {event.address}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <form action={deleteAdminEventAction}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <Button size="sm" type="submit" variant="destructive">
                    <Trash2Icon data-icon="inline-start" />
                    Eliminar
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <Card className="rounded-lg border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Todavía no hay eventos creados.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}
