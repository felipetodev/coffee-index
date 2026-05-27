"use client"

import { useActionState, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HeartIcon, HeartOff } from "lucide-react"
import { toast } from "sonner"

import {
  toggleCafeFavoriteAction,
  type FavoriteActionState,
} from "@/app/cafeterias/[slug]/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const favoriteInitialState: FavoriteActionState = {}

export function FavoriteButton({
  cafeId,
  className,
  initialFavorite,
  isSignedIn,
  children,
}: {
  cafeId?: string
  className?: string
  initialFavorite: boolean
  isSignedIn: boolean
  children?: React.ReactNode
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [state, formAction, isPending] = useActionState(
    toggleCafeFavoriteAction,
    favoriteInitialState
  )
  const router = useRouter()
  const isFavorite = state.isFavorite ?? initialFavorite

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }

    if (state.success) {
      toast.success(state.success)
      router.refresh()
    }
  }, [router, state.error, state.success])

  if (!cafeId) return null

  const favoriteButtonClassName =
    "rounded-full bg-background/75 text-foreground shadow-sm ring-1 ring-border backdrop-blur hover:bg-background"

  if (!isSignedIn) {
    return (
      <Button
        aria-label="Inicia sesión para guardar favoritos"
        className={cn(favoriteButtonClassName, className)}
        nativeButton={false}
        render={<Link href="/sign-in" />}
        size="icon"
        title="Inicia sesión para guardar favoritos"
        variant="ghost"
      >
        <HeartIcon className="size-5" />
      </Button>
    )
  }

  if (children) {
    return (
      <FavoriteFormWrapper cafeId={cafeId} formAction={formAction}>
        <Button
          aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          aria-pressed={isFavorite}
          className={className}
          disabled={isPending}
          size="sm"
          title="Favorito"
          variant="outline"
          type="submit"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isHovered ? (
            <HeartOff
              data-icon="inline-start"
              className={`${isFavorite ? "fill-red-500 text-red-500" : ""}`}
            />
          ) : (
            <HeartIcon
              data-icon="inline-start"
              className={`${isFavorite ? "fill-red-500 text-red-500" : ""}`}
            />)} 
          {children}
        </Button>
      </FavoriteFormWrapper>
    )
  }

  return (
    <FavoriteFormWrapper cafeId={cafeId} formAction={formAction}>
      <Button
        aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        aria-pressed={isFavorite}
        className={cn(favoriteButtonClassName, className)}
        disabled={isPending}
        size="icon"
        title="Favorito"
        type="submit"
        variant="ghost"
      >
        <HeartIcon
          className={cn(
            "size-5",
            isFavorite && "fill-red-500 text-red-500"
          )}
        />
      </Button>
    </FavoriteFormWrapper>
  )
}

function FavoriteFormWrapper({
  cafeId,
  formAction,
  children,
}: {
  cafeId: string
  formAction: (payload: FormData) => void
  children: React.ReactNode
}) {
  return (
    <form action={formAction}>
      <input name="cafeId" type="hidden" value={cafeId} />
      {children}
    </form>
  )
}
