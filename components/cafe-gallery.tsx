"use client"

import Link from "next/link"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { CafeVisual } from "@/components/cafe-visual"
import type { CafeImage } from "@/lib/cafes"

type CafeGalleryProps = {
  name: string
  images: CafeImage[]
  className?: string
  itemClassName?: string
}

export function CafeGallery({
  name,
  images,
  className,
  itemClassName,
}: CafeGalleryProps) {
  return (
    <Carousel className={className} opts={{ align: "start" }}>
      <CarouselContent>
        {images.map((image) => (
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
                />
              </Link>
            ) : (
              <CafeVisual
                className={itemClassName}
                label={image.label}
                name={name}
                src={image.src}
              />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-3" />
      <CarouselNext className="right-3" />
    </Carousel>
  )
}
