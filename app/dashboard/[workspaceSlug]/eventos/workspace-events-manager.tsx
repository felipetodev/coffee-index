"use client"

import { useActionState, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  CalendarPlusIcon,
  ExternalLinkIcon,
  ImageIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  createWorkspaceEventAction,
  deleteWorkspaceEventAction,
  updateWorkspaceEventAction,
  type EventActionState,
} from "@/app/dashboard/[workspaceSlug]/eventos/actions"
import type { EventViewModel } from "@/lib/data/events"
import {
  PhotoUploadFields,
  useSelectedUploadFiles,
} from "@/components/photo-upload-fields"
import { formatEventRange } from "@/components/event-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const initialState: EventActionState = {}
const maxImages = 3
const maxImageSizeBytes = 5 * 1024 * 1024

export function WorkspaceEventsManager({
  cafeName,
  workspaceSlug,
  events,
}: {
  cafeName: string
  workspaceSlug: string
  events: EventViewModel[]
}) {
  const [state, action, isPending] = useActionState(
    createWorkspaceEventAction,
    initialState
  )
  const [selectedFiles, setSelectedFiles] = useSelectedUploadFiles()
  const [tags, setTags] = useState("")

  useToastFromState(state)

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium">Eventos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Publica actividades, catas y encuentros de {cafeName}.
          </p>
        </div>
        <Badge variant="secondary">{events.length} eventos</Badge>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Nuevo evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <input name="workspaceSlug" type="hidden" value={workspaceSlug} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Titulo
                <Input name="title" placeholder="Caffe Party" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Hook opcional
                <Input name="subtitle" placeholder="Una noche de espresso martinis" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Descripcion
              <textarea
                className="min-h-32 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                name="description"
                placeholder="Cuenta que incluye, horarios, cupos, precio, invitades y cualquier detalle importante."
                required
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Inicio
                <Input name="startsAt" required type="datetime-local" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Termino
                <Input name="endsAt" required type="datetime-local" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Ubicacion
                <Input name="address" placeholder="Direccion o sala del evento" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Link opcional
                <Input name="externalUrl" placeholder="https://..." type="url" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Tags
              <Input
                onChange={(event) => setTags(event.currentTarget.value)}
                placeholder="cata, musica, brunch"
                value={tags}
              />
            </label>
            {tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
              .map((tag) => (
                <input key={tag} name="tags" type="hidden" value={tag} />
              ))}
            <PhotoUploadFields
              helperText="Estas imagenes apareceran en el feed y detalle del evento."
              label="Imagenes del evento"
              maxFiles={maxImages}
              maxFileSizeBytes={maxImageSizeBytes}
              onFilesChange={setSelectedFiles}
              placeholder="Poster, invitades, ambiente..."
              selectedFiles={selectedFiles}
            />
            <Button className="w-fit" disabled={isPending} type="submit">
              <CalendarPlusIcon data-icon="inline-start" />
              {isPending ? "Publicando..." : "Publicar evento"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {events.length === 0 ? (
          <Card className="rounded-lg border-dashed">
            <CardContent className="grid min-h-36 place-items-center gap-3 py-8 text-center">
              <ImageIcon className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Todavia no hay eventos.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  El primer evento publicado aparecera en el feed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => <WorkspaceEventRow event={event} key={event.id} />)
        )}
      </div>
    </section>
  )
}

function WorkspaceEventRow({ event }: { event: EventViewModel }) {
  const [state, action, isPending] = useActionState(
    deleteWorkspaceEventAction,
    initialState
  )

  useToastFromState(state)

  return (
    <Card className="rounded-lg">
      <CardContent className="grid gap-4 md:grid-cols-[8rem_1fr_auto] md:items-center">
        <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-muted">
          {event.media[0] ? (
            <Image
              alt={event.media[0].alt}
              className="h-full w-full object-cover"
              fill
              sizes="8rem"
              src={event.media[0].url}
            />
          ) : (
            <div className="grid h-full place-items-center">
              <ImageIcon className="size-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant={event.status === "published" ? "default" : "secondary"}>
              {event.status === "published" ? "Publicado" : event.status}
            </Badge>
            {event.isFinished ? <Badge variant="secondary">Finalizado</Badge> : null}
          </div>
          <h3 className="mt-2 truncate font-medium">{event.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatEventRange(event.startsAt, event.endsAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/eventos/${event.slug}`} />}
            size="sm"
            variant="outline"
          >
            Ver
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
          <form action={action}>
            <input name="eventId" type="hidden" value={event.id} />
            <Button disabled={isPending} size="sm" type="submit" variant="destructive">
              <Trash2Icon data-icon="inline-start" />
              Eliminar
            </Button>
          </form>
        </div>
        <details className="md:col-span-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Editar datos
          </summary>
          <EditEventForm event={event} />
        </details>
      </CardContent>
    </Card>
  )
}

function EditEventForm({ event }: { event: EventViewModel }) {
  const [state, action, isPending] = useActionState(
    updateWorkspaceEventAction,
    initialState
  )
  const [tags, setTags] = useState(event.tags.join(", "))

  useToastFromState(state)

  return (
    <form action={action} className="mt-4 grid gap-4 rounded-lg border bg-muted/20 p-3">
      <input name="eventId" type="hidden" value={event.id} />
      <input name="workspaceSlug" type="hidden" value={event.workspaceSlug} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Titulo
          <Input defaultValue={event.title} name="title" required />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Hook opcional
          <Input defaultValue={event.subtitle ?? ""} name="subtitle" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Descripcion
        <textarea
          className="min-h-24 rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue={event.description}
          name="description"
          required
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Inicio
          <Input defaultValue={toDateTimeLocal(event.startsAt)} name="startsAt" required type="datetime-local" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Termino
          <Input defaultValue={toDateTimeLocal(event.endsAt)} name="endsAt" required type="datetime-local" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Ubicacion
          <Input defaultValue={event.address} name="address" required />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Link opcional
          <Input defaultValue={event.externalUrl ?? ""} name="externalUrl" type="url" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Tags
        <Input onChange={(item) => setTags(item.currentTarget.value)} value={tags} />
      </label>
      {tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (
          <input key={tag} name="tags" type="hidden" value={tag} />
        ))}
      <Button className="w-fit" disabled={isPending} size="sm" type="submit">
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  )
}

function useToastFromState(state: EventActionState) {
  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }

    if (state.success) {
      toast.success(state.success)
    }
  }, [state.error, state.success])
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  const offsetMs = date.getTimezoneOffset() * 60 * 1000

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}
