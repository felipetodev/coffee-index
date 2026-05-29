"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import type { EventMediaViewModel } from "@/lib/data/events"
import { Badge } from "@/components/ui/badge"
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export function EventImageCarousel({
  images,
  title,
}: {
  images: EventMediaViewModel[]
  title: string
}) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(1)

  useEffect(() => {
    if (!api) {
      return
    }

    const updateCurrent = () => setCurrent(api.selectedScrollSnap() + 1)

    updateCurrent()
    api.on("select", updateCurrent)
    api.on("reInit", updateCurrent)

    return () => {
      api.off("select", updateCurrent)
      api.off("reInit", updateCurrent)
    }
  }, [api])

  if (images.length === 0) {
    return null
  }

  return (
    <Carousel className="border overflow-hidden rounded-lg bg-muted" opts={{ loop: images.length > 1 }} setApi={setApi}>
      <Badge className="absolute right-3 top-3 z-10 bg-background/95 dark:bg-transparent shadow-sm backdrop-blur" variant="outline">
        {current} de {images.length}
      </Badge>
      <CarouselContent className="ml-0">
        {images.map((image, index) => (
          <CarouselItem className="pl-0" key={image.id}>
            <Image
              alt={image.alt || `${title} imagen ${index + 1}`}
              className="h-auto w-full"
              height={1200}
              priority={index === 0}
              sizes="(min-width: 1024px) 48rem, 100vw"
              src={image.url}
              width={1600}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 ? (
        <>
          <CarouselPrevious className="left-3 bg-background/90 shadow-sm" />
          <CarouselNext className="right-3 bg-background/90 shadow-sm" />
        </>
      ) : null}
    </Carousel>
  )
}
