"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import {
  ArrowUpRightIcon,
  CoffeeIcon,
  ExternalLinkIcon,
  HeartIcon,
  MapPinIcon,
  SearchIcon,
} from "lucide-react"

import { CafeGallery } from "@/components/cafe-gallery"
import { CafeMap } from "@/components/cafe-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { Cafe, CafeFeature } from "@/lib/cafes"
import {
  cafeFeatureLabels,
  communes,
  googleMapsUrl,
  instagramUrl,
} from "@/lib/cafes"

type CafeCatalogProps = {
  cafes: Cafe[]
}

const SAVED_CAFES_STORAGE_KEY = "cafeteria.saved-cafes"
const SAVED_CAFES_CHANGE_EVENT = "cafeteria:saved-cafes-change"

function subscribeToSavedCafes(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(SAVED_CAFES_CHANGE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(SAVED_CAFES_CHANGE_EVENT, onStoreChange)
  }
}

function getSavedCafesSnapshot() {
  return window.localStorage.getItem(SAVED_CAFES_STORAGE_KEY) ?? "[]"
}

function getSavedCafesServerSnapshot() {
  return "[]"
}

function writeSavedCafeSlugs(slugs: string[]) {
  window.localStorage.setItem(SAVED_CAFES_STORAGE_KEY, JSON.stringify(slugs))
  window.dispatchEvent(new Event(SAVED_CAFES_CHANGE_EVENT))
}

export function CafeCatalog({ cafes }: CafeCatalogProps) {
  const [query, setQuery] = useState("")
  const [commune, setCommune] = useState("Todas")
  const [selectedFeature, setSelectedFeature] = useState<CafeFeature | "Todas">(
    "Todas"
  )

  const savedCafeSlugsSnapshot = useSyncExternalStore(
    subscribeToSavedCafes,
    getSavedCafesSnapshot,
    getSavedCafesServerSnapshot
  )

  const savedCafeSlugs = useMemo(() => {
    try {
      const parsedValue = JSON.parse(savedCafeSlugsSnapshot)

      if (!Array.isArray(parsedValue)) {
        return []
      }

      const knownSlugs = new Set(cafes.map((cafe) => cafe.slug))
      const storedSlugs = parsedValue.filter(
        (slug): slug is string =>
          typeof slug === "string" && knownSlugs.has(slug)
      )

      return [...new Set(storedSlugs)]
    } catch {
      return []
    }
  }, [cafes, savedCafeSlugsSnapshot])

  const filteredCafes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return cafes.filter((cafe) => {
      const matchesCommune = commune === "Todas" || cafe.commune === commune
      const matchesFeature =
        selectedFeature === "Todas" || cafe.features.includes(selectedFeature)
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          cafe.name,
          cafe.commune,
          cafe.instagram,
          cafe.addresses.join(" "),
          cafe.features.map((feature) => cafeFeatureLabels[feature]).join(" "),
          cafe.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesCommune && matchesFeature && matchesQuery
    })
  }, [cafes, commune, query, selectedFeature])

  const savedCafes = useMemo(
    () =>
      savedCafeSlugs
        .map((slug) => cafes.find((cafe) => cafe.slug === slug))
        .filter((cafe): cafe is Cafe => Boolean(cafe)),
    [cafes, savedCafeSlugs]
  )

  const toggleSavedCafe = (slug: string) => {
    writeSavedCafeSlugs(
      savedCafeSlugs.includes(slug)
        ? savedCafeSlugs.filter((savedSlug) => savedSlug !== slug)
        : [...savedCafeSlugs, slug]
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CoffeeIcon />
                The Coffee Index
              </p>
              <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
                The index of specialty coffee culture in Chile.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Cafeterías, barras y tostadores para guardar, visitar y volver
                a encontrar.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {cafes.length} lugares curatoriales
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cafe-search-input"
                className="h-11 pl-9"
                placeholder="Buscar por cafetería, comuna, dirección o estilo"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {["Todas", ...communes].map((item) => (
                <Button
                  key={item}
                  variant={commune === item ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCommune(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              ["Todas", "Todas"],
              ...Object.entries(cafeFeatureLabels),
            ].map(([feature, label]) => (
              <Button
                key={feature}
                variant={selectedFeature === feature ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSelectedFeature(feature as CafeFeature | "Todas")
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="min-h-0" suppressHydrationWarning>
          {savedCafes.length > 0 && (
            <SavedCafesCarousel
              cafes={savedCafes}
              onToggleSaved={toggleSavedCafe}
            />
          )}
        </div>

        <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-xl font-medium tracking-tight">
              {filteredCafes.length} resultados
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Usa los filtros para encontrar cafés tranquilos, con brunch,
              aptos para laptop o buenos para juntarse.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            Catálogo beta
          </Badge>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCafes.map((cafe, index) => (
            <CafeCard
              cafe={cafe}
              index={index}
              isSaved={savedCafeSlugs.includes(cafe.slug)}
              key={cafe.slug}
              onToggleSaved={toggleSavedCafe}
            />
          ))}
        </section>
      </main>
    </div>
  )
}

function SavedCafesCarousel({
  cafes,
  onToggleSaved,
}: {
  cafes: Cafe[]
  onToggleSaved: (slug: string) => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Favoritos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus cafeterías favoritas quedan aquí para revisarlas rápido.
          </p>
        </div>
        <Badge variant="secondary">{cafes.length}</Badge>
      </div>
      <CafeGallery
        className="[&_[data-slot=carousel-item]]:basis-[78%] [&_[data-slot=carousel-item]]:sm:basis-[42%] [&_[data-slot=carousel-item]]:lg:basis-[28%]"
        images={cafes.map((cafe) => ({
          label: cafe.name,
          href: `/cafeterias/${cafe.slug}`,
          src: cafe.imagePlaceholders[0]?.src,
        }))}
        itemClassName="min-h-44"
        name="Cafeterías guardadas"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cafes.map((cafe) => (
          <Button
            key={cafe.slug}
            variant="outline"
            size="sm"
            onClick={() => onToggleSaved(cafe.slug)}
          >
            <HeartIcon
              data-icon="inline-start"
              className="fill-red-500 text-red-500"
            />
            {cafe.name}
          </Button>
        ))}
      </div>
    </section>
  )
}

function CafeCard({
  cafe,
  index,
  isSaved,
  onToggleSaved,
}: {
  cafe: Cafe
  index: number
  isSaved: boolean
  onToggleSaved: (slug: string) => void
}) {
  return (
    <Card className="h-full rounded-lg">
      <CardContent className="relative pt-0">
        <CafeGallery
          name={cafe.name}
          images={cafe.imagePlaceholders}
          itemClassName="min-h-52"
          laodImageEager={index < 3}
        />
        <Button
          className="absolute right-6 top-4 rounded-full bg-background/75 text-foreground shadow-sm ring-1 ring-border backdrop-blur hover:bg-background"
          variant="ghost"
          size="icon"
          aria-label={
            isSaved
              ? `Quitar ${cafe.name} de guardadas`
              : `Guardar ${cafe.name}`
          }
          aria-pressed={isSaved}
          onClick={() => onToggleSaved(cafe.slug)}
        >
          <HeartIcon
            className={isSaved ? "fill-red-500 text-red-500" : ""}
          />
        </Button>
      </CardContent>
      <CardHeader>
        <CardTitle className="text-lg">
          <Link
            className="rounded-sm transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href={`/cafeterias/${cafe.slug}`}
          >
            {cafe.name}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <MapPinIcon className="mt-0.5 shrink-0" />
          <span>{cafe.addresses[0]}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {cafe.description}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{cafe.commune}</Badge>
          {cafe.features.slice(0, 3).map((feature) => (
            <Badge key={feature} variant="outline">
              {cafeFeatureLabels[feature]}
            </Badge>
          ))}
          {cafe.addresses.length > 1 && (
            <Badge variant="secondary">Múltiples sedes</Badge>
          )}
          {cafe.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <CafeQuickView cafe={cafe} />
        <Button
          nativeButton={false}
          render={<Link href={`/cafeterias/${cafe.slug}`} />}
          size="sm"
        >
          Ver ficha
          <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function CafeQuickView({ cafe }: { cafe: Cafe }) {
  return (
    <Dialog key={cafe.slug}>
      <DialogTrigger render={<Button variant="outline" className="cursor-pointer" size="sm" />}>
        Vista rápida
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{cafe.name}</DialogTitle>
          <DialogDescription>
            {cafe.commune} · {cafe.instagram}
          </DialogDescription>
        </DialogHeader>
        <CafeGallery
          name={cafe.name}
          images={cafe.imagePlaceholders}
          itemClassName="min-h-64"
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_0.9fr]">
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {cafe.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {cafe.features.map((feature) => (
                <Badge key={feature} variant="outline">
                  {cafeFeatureLabels[feature]}
                </Badge>
              ))}
              {cafe.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Dirección</p>
              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                {cafe.addresses.map((address) => (
                  <span key={address}>{address}</span>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium">Ubicación</p>
              <CafeMap
                addresses={cafe.addresses}
                className="mt-3 h-44"
                name={cafe.name}
              />
              <div className="mt-2 flex flex-col gap-2">
                {cafe.addresses.map((address) => (
                  <Button
                    key={address}
                    className="justify-between"
                    nativeButton={false}
                    render={
                      <a
                        href={googleMapsUrl(address)}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                    variant="outline"
                    size="sm"
                  >
                    Abrir en Google Maps
                    <ExternalLinkIcon data-icon="inline-end" />
                  </Button>
                ))}
              </div>
            </div>
            <ButtonGroup className="mt-auto">
              <Button
                nativeButton={false}
                render={<a href={instagramUrl(cafe.instagram)} target="_blank" rel="noreferrer" />}
                variant="outline"
                size="sm"
              >
                Instagram
                <ExternalLinkIcon data-icon="inline-end" />
              </Button>
              <Button
                nativeButton={false}
                render={<Link href={`/cafeterias/${cafe.slug}`} />}
                size="sm"
              >
                Ficha
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
