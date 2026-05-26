"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export type SelectedUploadFile = {
  file: File
  previewUrl: string
}

export function PhotoUploadFields({
  altName = "altTexts",
  disabled,
  fileName = "photos",
  helperText = "Escribe una descripción corta para cada imagen.",
  label = "Imágenes",
  maxFiles,
  maxFileSizeBytes,
  onFilesChange,
  placeholder = "Interior del local, barra de café...",
  selectedFiles,
  showAltFields = true,
  previewSize = "default",
}: {
  altName?: string
  disabled?: boolean
  fileName?: string
  helperText?: string
  label?: string
  maxFiles: number
  maxFileSizeBytes: number
  onFilesChange: (files: SelectedUploadFile[]) => void
  placeholder?: string
  selectedFiles: SelectedUploadFile[]
  showAltFields?: boolean
  previewSize?: "default" | "compact"
}) {
  useEffect(() => {
    return () => {
      for (const item of selectedFiles) {
        URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [selectedFiles])

  return (
    <>
      <label className="grid gap-2 text-sm font-medium">
        {label}
        <Input
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          multiple
          name={fileName}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? [])

            for (const item of selectedFiles) {
              URL.revokeObjectURL(item.previewUrl)
            }

            if (files.length > maxFiles) {
              event.currentTarget.value = ""
              onFilesChange([])
              toast.error(`Puedes subir un máximo de ${maxFiles} fotos.`)
              return
            }

            if (files.some((file) => !allowedImageTypes.has(file.type))) {
              event.currentTarget.value = ""
              onFilesChange([])
              toast.error("Solo se permiten imágenes JPG, PNG o WebP.")
              return
            }

            if (files.some((file) => file.size > maxFileSizeBytes)) {
              event.currentTarget.value = ""
              onFilesChange([])
              toast.error("Cada imagen debe pesar 1 MB o menos.")
              return
            }

            onFilesChange(
              files.map((file) => ({
                file,
                previewUrl: URL.createObjectURL(file),
              }))
            )
          }}
          type="file"
        />
      </label>
      {!showAltFields && selectedFiles.length === 0 ? null : (
      <div
        className={
          showAltFields
            ? "grid gap-3 rounded-lg border bg-muted/20 p-3"
            : "flex flex-wrap gap-3 rounded-lg border bg-muted/20 p-3"
        }
      >
        {showAltFields ? (
          <div>
            <p className="text-sm font-medium">Textos alternativos</p>
            <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
          </div>
        ) : null}
        {Array.from({
          length: showAltFields
            ? Math.max(selectedFiles.length, 1)
            : selectedFiles.length,
        }).map(
          (_, index) => {
            const selectedFile = selectedFiles[index]
            const file = selectedFile?.file

            return (
              <div
                className={
                  showAltFields
                    ? "grid gap-3 rounded-lg border bg-background p-2 sm:grid-cols-[96px_1fr] sm:items-center"
                    : previewSize === "compact"
                      ? "relative aspect-[4/3] w-24 overflow-hidden rounded-lg bg-muted"
                      : "relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted sm:w-32"
                }
                key={
                  file
                    ? `${file.name}-${file.lastModified}-${index}`
                    : "default-alt-text"
                }
              >
                {showAltFields ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                    <PreviewImage
                      previewUrl={selectedFile?.previewUrl}
                      size="96px"
                    />
                  </div>
                ) : (
                  <PreviewImage
                    previewUrl={selectedFile?.previewUrl}
                    size="(min-width: 640px) 33vw, 100vw"
                  />
                )}
                {showAltFields ? (
                  <label className="grid gap-2 text-sm font-medium">
                    Foto {index + 1}
                    <Input
                      disabled={disabled}
                      name={altName}
                      placeholder={file?.name ?? placeholder}
                    />
                  </label>
                ) : null}
              </div>
            )
          }
        )}
      </div>
      )}
    </>
  )
}

export function useSelectedUploadFiles() {
  return useState<SelectedUploadFile[]>([])
}

function PreviewImage({
  previewUrl,
  size,
}: {
  previewUrl?: string
  size: string
}) {
  return previewUrl ? (
    <Image
      alt="Preview foto seleccionada"
      className="h-full w-full object-cover"
      fill
      sizes={size}
      src={previewUrl}
      unoptimized
    />
  ) : (
    <div className="grid h-full place-items-center">
      <ImageIcon className="size-5 text-muted-foreground" />
    </div>
  )
}
