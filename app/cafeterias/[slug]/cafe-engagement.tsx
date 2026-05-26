"use client"

import { useActionState, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HeartIcon, SendIcon, StarIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"

import {
  submitCafeReviewAction,
  toggleCafeFavoriteAction,
  type FavoriteActionState,
  type ReviewActionState,
} from "@/app/cafeterias/[slug]/actions"
import {
  PhotoUploadFields,
  useSelectedUploadFiles,
} from "@/components/photo-upload-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  CafeReviewViewModel,
  ViewerCafeState,
} from "@/lib/data/reviews"
import { cn } from "@/lib/utils"

const reviewInitialState: ReviewActionState = {}
const favoriteInitialState: FavoriteActionState = {}
const minReviewLength = 80
const maxReviewPhotos = 3
const maxPhotoSizeBytes = 1024 * 1024

export function CafeEngagement({
  approvedReviews,
  cafeId,
  cafeSlug,
  viewerState,
}: {
  approvedReviews: CafeReviewViewModel[]
  cafeId?: string
  cafeSlug: string
  viewerState: ViewerCafeState
}) {
  if (!cafeId) {
    return null
  }

  return (
    <section className="grid gap-4">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Comunidad</CardTitle>
          <CardDescription>
            Compartenos tu experiencia para ayudar a otros a conocer mejor este local.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/cafeterias/${cafeSlug}/review`} />}
          >
            <StarIcon data-icon="inline-start" />
            {viewerState.ownReview ? "Editar review" : "Escribir una review"}
          </Button>
          {!viewerState.isSignedIn ? (
            <Button
              nativeButton={false}
              render={<Link href="/sign-in" />}
              variant="outline"
            >
              Iniciar sesión
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <ApprovedReviews reviews={approvedReviews} />
    </section>
  )
}

export function CafeReviewForm({
  cafeId,
  cafeName,
  viewerState,
}: {
  cafeId: string
  cafeName: string
  viewerState: ViewerCafeState
}) {
  const [state, formAction, isPending] = useActionState(
    submitCafeReviewAction,
    reviewInitialState
  )
  const router = useRouter()
  const [rating, setRating] = useState(viewerState.ownReview?.rating ?? 0)
  const [selectedFiles, setSelectedFiles] = useSelectedUploadFiles()
  const defaultBody = viewerState.ownReview?.body ?? ""
  const ownStatus = viewerState.ownReview?.status
  const disabled = isPending || !viewerState.canSubmitReview

  useToastFromState(state)

  useEffect(() => {
    if (state.success) {
      setSelectedFiles([])
      router.refresh()
    }
  }, [router, setSelectedFiles, state.success])

  if (!viewerState.isSignedIn) {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Cuéntanos tu experiencia en {cafeName}</CardTitle>
          <CardDescription>
            Inicia sesión para escribir una reseña y adjuntar fotos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/sign-in" />}>
            Iniciar sesión
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Cuéntanos tu experiencia en {cafeName}</CardTitle>
        <CardDescription>
          Algunas cosas que deberías considerar en tu review: comida, servicio
          y ambiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <input name="cafeId" type="hidden" value={cafeId} />
          <input name="rating" type="hidden" value={rating} />
          {ownStatus && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ownStatus === "approved" ? "default" : "secondary"}>
                {statusLabel(ownStatus)}
              </Badge>
              {viewerState.nextReviewAt && (
                <span className="text-sm text-muted-foreground">
                  Puedes editar nuevamente {formatDate(viewerState.nextReviewAt)}.
                </span>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <p className="text-sm font-medium">Rating</p>
            <p className="text-sm text-muted-foreground">
              ¿Cómo calificarías tu experiencia?
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  aria-label={`${value} estrellas`}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  disabled={disabled}
                  key={value}
                  onClick={() => setRating(value)}
                  type="button"
                >
                  <StarIcon
                    className={cn(
                      "size-6",
                      value <= rating && "fill-current text-amber-500"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Reseña
            <span className="text-xs font-normal leading-5 text-muted-foreground">
              Algunas cosas que podrías considerar en tu review: comida,
              servicio y ambiente.
            </span>
            <textarea
              className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue={defaultBody}
              disabled={disabled}
              minLength={minReviewLength}
              name="body"
              placeholder={`Cuéntanos qué probaste, cómo fue el servicio y qué tipo de ambiente encontraste en ${cafeName}.`}
              required
            />
            <span className="text-xs font-normal text-muted-foreground">
              Mínimo {minReviewLength} caracteres.
            </span>
          </label>
          <PhotoUploadFields
            disabled={disabled}
            label="Fotos de tu experiencia"
            maxFiles={maxReviewPhotos}
            maxFileSizeBytes={maxPhotoSizeBytes}
            onFilesChange={setSelectedFiles}
            previewSize="compact"
            selectedFiles={selectedFiles}
            showAltFields={false}
          />
          {viewerState.ownReview?.media.length ? (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium">Fotos actuales</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Si subes nuevas fotos, reemplazarán estas automáticamente.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {viewerState.ownReview.media.map((media) => (
                  <div
                    className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
                    key={media.id}
                  >
                    <Image
                      alt={media.alt}
                      className="object-cover"
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      src={media.url}
                    />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  disabled={disabled || selectedFiles.length > 0}
                  name="removeExistingPhotos"
                  type="checkbox"
                />
                <TrashIcon className="size-4" />
                Eliminar fotos actuales al guardar
              </label>
            </div>
          ) : null}
          <Button
            className="w-fit"
            disabled={disabled || rating === 0}
            type="submit"
          >
            <SendIcon data-icon="inline-start" />
            {isPending ? "Publicando..." : "Publicar reseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function FavoriteButton({
  cafeId,
  initialFavorite,
  isSignedIn,
}: {
  cafeId: string
  initialFavorite: boolean
  isSignedIn: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    toggleCafeFavoriteAction,
    favoriteInitialState
  )
  const isFavorite = state.isFavorite ?? initialFavorite

  useToastFromState(state)

  if (!isSignedIn) {
    return (
      <Button
        aria-label="Inicia sesión para guardar favoritos"
        nativeButton={false}
        render={<Link href="/sign-in" />}
        size="icon"
        title="Inicia sesión para guardar favoritos"
        variant="ghost"
      >
        <HeartIcon className="size-5 text-muted-foreground" />
      </Button>
    )
  }

  return (
    <form action={formAction}>
      <input name="cafeId" type="hidden" value={cafeId} />
      <Button
        aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        disabled={isPending}
        size="icon"
        title="Favorito"
        type="submit"
        variant="ghost"
      >
        <HeartIcon
          className={cn(
            "size-5",
            isFavorite
              ? "fill-red-500 text-red-500"
              : "text-muted-foreground"
          )}
        />
      </Button>
    </form>
  )
}

function ApprovedReviews({ reviews }: { reviews: CafeReviewViewModel[] }) {
  return (
    <div className="grid gap-3" id="reviews">
      <h3 className="text-base font-medium">Reseñas</h3>
      {reviews.length === 0 ? (
        <Card className="rounded-lg border-dashed">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Todavía no hay reseñas para este local. Sé el primero en dejar una.
          </CardContent>
        </Card>
      ) : (
        reviews.map((review) => (
          <Card className="rounded-lg" key={review.id}>
            <CardContent className="grid gap-4 pt-6">
              <div className="flex items-center gap-3">
                <div className="relative size-10 overflow-hidden rounded-full bg-muted">
                  {review.authorImageUrl ? (
                    <Image
                      alt={review.authorName}
                      className="object-cover"
                      fill
                      sizes="40px"
                      src={review.authorImageUrl}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm font-medium text-muted-foreground">
                      {review.authorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {review.authorName}
                    </p>
                    {review.viewerCanSeeStatus ? (
                      <Badge variant="secondary">
                        {reviewStatusLabel(review.status)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatReviewDate(review.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((value) => (
                  <StarIcon
                    className={cn("size-4", value <= review.rating && "fill-current")}
                    key={value}
                  />
                ))}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{review.body}</p>
              {review.media.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {review.media.map((media, index) => (
                    <div
                      className="relative aspect-4/3 w-28 overflow-hidden rounded-lg bg-muted"
                      key={media.id}
                    >
                      <Image
                        alt={`Foto de la review de ${review.authorName} ${index + 1}`}
                        className="object-cover"
                        loading="lazy"
                        fill
                        sizes="112px"
                        src={media.url}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function useToastFromState(state: ReviewActionState | FavoriteActionState) {
  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }

    if (state.success) {
      toast.success(state.success)
    }
  }, [state.error, state.success])
}

function statusLabel(status: CafeReviewViewModel["status"]) {
  if (status === "approved") {
    return "Aprobada"
  }

  if (status === "rejected") {
    return "Rechazada"
  }

  return "Pendiente"
}

function reviewStatusLabel(status: CafeReviewViewModel["status"]) {
  if (status === "pending") {
    return "Validando"
  }

  if (status === "rejected") {
    return "No publicada"
  }

  return "Publicada"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatReviewDate(value: string) {
  const formatted = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))

  return formatted.replace(".", "")
}
