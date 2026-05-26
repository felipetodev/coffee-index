"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ImagesIcon } from "lucide-react"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { CafeVisual } from "@/components/cafe-visual"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { CafeImage } from "@/lib/cafes"

type CafeGalleryProps = {
  name: string
  images: CafeImage[]
  className?: string
  itemClassName?: string
  showAllPhotosCta?: boolean
  loadImageEager?: boolean
}

export function CafeGallery({
  name,
  images,
  className,
  itemClassName,
  showAllPhotosCta = false,
  loadImageEager,
}: CafeGalleryProps) {
  const galleryImages =
    images.length > 0
      ? images
      : [{ label: "Foto por confirmar" }]

  return (
    <div className="relative">
      <Carousel className={className} opts={{ align: "start" }}>
        <CarouselContent>
          {galleryImages.map((image, index) => (
            <CarouselItem key={image.src ?? image.label}>
              {image.href ? (
                <Link
                  className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  href={image.href}
                >
                  <CafeVisual
                    className={itemClassName}
                    label={image.label}
                    name={name}
                    src={image.src}
                    loading={loadImageEager && index === 0 ? "eager" : "lazy"}
                  />
                </Link>
              ) : (
                <CafeVisual
                  className={itemClassName}
                  label={image.label}
                  name={name}
                  src={image.src}
                  loading={loadImageEager && index === 0 ? "eager" : "lazy"}
                />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3" />
        <CarouselNext className="right-3" />
      </Carousel>

      {showAllPhotosCta && images.length > 0 && (
        <AllCafePhotosDialog images={images} name={name} />
      )}
    </div>
  )
}

function AllCafePhotosDialog({
  images,
  name,
}: {
  images: CafeImage[]
  name: string
}) {
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})

  const dialogImages = useMemo(
    () =>
      images.map((image, index) => ({
        ...image,
        key: image.src ?? `${image.label}-${index}`,
        skeletonClassName: index % 3 === 1 ? "h-80" : "h-56",
      })),
    [images]
  )

  return (
    <Dialog key="cafe-gallery-dialog">
      <DialogTrigger
        className="cursor-pointer"
        render={
          <Button
            className="absolute bottom-4 right-4 bg-background/95 shadow-sm backdrop-blur hover:bg-background"
            variant="outline"
            size="sm"
          />
        }
      >
        <ImagesIcon data-icon="inline-start" />
        Mostrar todas las fotos
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <div className="columns-1 gap-4 sm:columns-2">
          {dialogImages.map((image, i) => (
            <figure
              className="mb-4 break-inside-avoid overflow-hidden rounded-lg border bg-muted"
              key={image.key}
            >
              {image.src ? (
                <>
                  {!loadedImages[image.key] ? (
                    <Skeleton className={image.skeletonClassName} />
                  ) : null}
                  {/* The browser preserves each asset ratio here, which is what makes
                  the CSS columns behave like a light masonry gallery. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt={`${name}: ${image.label}`}
                    className={loadedImages[image.key] ? "h-auto w-full" : "hidden"}
                    loading={i < 3 ? "eager" : "lazy"}
                    onLoad={() =>
                      setLoadedImages((current) => ({
                        ...current,
                        [image.key]: true,
                      }))
                    }
                  />
                </>
              ) : (
                <CafeVisual
                  label={image.label}
                  name={name}
                  loading={i < 3 ? "eager" : "lazy"}
                />
              )}
              <figcaption className="bg-background px-3 py-2 text-sm text-muted-foreground">
                {image.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
