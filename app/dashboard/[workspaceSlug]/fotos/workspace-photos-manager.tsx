"use client"

import { useActionState, useEffect } from "react"
import Image from "next/image"
import {
  ImageIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  deleteWorkspacePhotoAction,
  replaceWorkspacePhotoAction,
  updateWorkspacePhotoMetaAction,
  uploadWorkspacePhotosAction,
  type PhotoActionState,
} from "@/app/dashboard/[workspaceSlug]/fotos/actions"
import type { WorkspacePhoto } from "@/app/dashboard/[workspaceSlug]/fotos/data"
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
import { Input } from "@/components/ui/input"

const initialState: PhotoActionState = {}
const maxPhotos = 3
const maxPhotoSizeBytes = 1024 * 1024

export function WorkspacePhotosManager({
  cafeName,
  workspaceSlug,
  photos,
}: {
  cafeName: string
  workspaceSlug: string
  photos: WorkspacePhoto[]
}) {
  const [uploadState, uploadAction, isUploading] = useActionState(
    uploadWorkspacePhotosAction,
    initialState
  )
  const [selectedFiles, setSelectedFiles] = useSelectedUploadFiles()
  const remainingSlots = Math.max(maxPhotos - photos.length, 0)
  const uploadDisabled = remainingSlots === 0 || isUploading

  useToastFromState(uploadState)

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium">Fotos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las imágenes públicas de {cafeName}.
          </p>
        </div>
        <Badge variant={remainingSlots === 0 ? "secondary" : "default"}>
          {photos.length}/{maxPhotos} publicadas
        </Badge>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Subir fotos</CardTitle>
          <CardDescription>
            JPG, PNG o WebP. Máximo 1 MB por imagen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadAction} className="grid gap-4">
            <input name="workspaceSlug" type="hidden" value={workspaceSlug} />
            <PhotoUploadFields
              disabled={uploadDisabled}
              label="Imágenes (puedes seleccionar varias a la vez)"
              maxFiles={remainingSlots}
              maxFileSizeBytes={maxPhotoSizeBytes}
              onFilesChange={setSelectedFiles}
              selectedFiles={selectedFiles}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={uploadDisabled} type="submit">
                <PlusIcon data-icon="inline-start" />
                {isUploading ? "Subiendo..." : "Subir fotos"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {remainingSlots === 0
                  ? "Ya alcanzaste el máximo de fotos."
                  : `Puedes agregar ${remainingSlots} más.`}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {photos.length === 0 ? (
          <Card className="rounded-lg border-dashed lg:col-span-3">
            <CardContent className="grid min-h-40 place-items-center gap-3 py-8 text-center">
              <ImageIcon className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Todavía no hay fotos publicadas.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sube hasta 3 imágenes para que aparezcan en el catálogo.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          photos.map((photo, index) => (
            <WorkspacePhotoCard
              key={photo.id}
              index={index}
              photo={photo}
            />
          ))
        )}
      </div>
    </section>
  )
}

function WorkspacePhotoCard({
  photo,
  index,
}: {
  photo: WorkspacePhoto
  index: number
}) {
  const [metaState, metaAction, isSavingMeta] = useActionState(
    updateWorkspacePhotoMetaAction,
    initialState
  )
  const [replaceState, replaceAction, isReplacing] = useActionState(
    replaceWorkspacePhotoAction,
    initialState
  )
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteWorkspacePhotoAction,
    initialState
  )

  useToastFromState(metaState)
  useToastFromState(replaceState)
  useToastFromState(deleteState)

  return (
    <Card className="rounded-lg pt-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          alt={photo.alt || `Foto ${index + 1}`}
          className="h-full w-full object-cover"
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          src={photo.url}
        />
        <Badge className="absolute left-3 top-3" variant="secondary">
          #{index + 1}
        </Badge>
      </div>
      <CardContent className="grid gap-4">
        <form action={metaAction} className="grid gap-2">
          <input name="photoId" type="hidden" value={photo.id} />
          <label className="grid gap-2 text-sm font-medium">
            Texto alternativo
            <Input
              defaultValue={photo.alt}
              name="alt"
              placeholder="Foto del local"
              required
            />
          </label>
          <Button
            className="w-fit"
            disabled={isSavingMeta}
            size="sm"
            type="submit"
            variant="outline"
          >
            <PencilIcon data-icon="inline-start" />
            {isSavingMeta ? "Guardando..." : "Guardar texto"}
          </Button>
        </form>

        <form action={replaceAction} className="grid gap-2">
          <input name="photoId" type="hidden" value={photo.id} />
          <input name="alt" type="hidden" value={photo.alt} />
          <label className="grid gap-2 text-sm font-medium">
            Reemplazar imagen
            <Input
              accept="image/jpeg,image/png,image/webp"
              name="photo"
              required
              type="file"
            />
          </label>
          <Button
            className="w-fit"
            disabled={isReplacing}
            size="sm"
            type="submit"
            variant="outline"
          >
            <RefreshCwIcon data-icon="inline-start" />
            {isReplacing ? "Reemplazando..." : "Reemplazar"}
          </Button>
        </form>

        <form action={deleteAction}>
          <input name="photoId" type="hidden" value={photo.id} />
          <Button
            disabled={isDeleting}
            size="sm"
            type="submit"
            variant="destructive"
          >
            <Trash2Icon data-icon="inline-start" />
            {isDeleting ? "Eliminando..." : "Eliminar foto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function useToastFromState(state: PhotoActionState) {
  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }

    if (state.success) {
      toast.success(state.success)
    }
  }, [state.error, state.success])
}
