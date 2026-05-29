import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  CalendarClockIcon,
  ExternalLinkIcon,
  GlobeIcon,
  MapPinIcon,
  SparklesIcon,
  VerifiedIcon,
} from "lucide-react"

import { CafeGallery } from "@/components/cafe-gallery"
import { CafeMap } from "@/components/cafe-map"
import { CafeEngagement } from "@/app/cafeterias/[slug]/cafe-engagement"
import { FavoriteButton } from "@/components/favorite-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getPublishedCafeBySlug, getPublishedCafes } from "@/lib/data/cafes"
import { instagramUrl } from "@/lib/social-links"
import { googleMapsUrl } from "@/lib/utils"
import { getActiveEventsForCafe } from "@/lib/data/events"
import { getViewerCafeState, getVisibleCafeReviews } from "@/lib/data/reviews"
import {
  cafeImageUrl,
  cafePath,
  createCafeStructuredData,
  siteConfig,
} from "@/lib/seo"
import { cn } from "@/lib/utils"

type CafePageProps = {
  params: Promise<{
    slug: string
  }>
}

export const revalidate = 3600

export function generateStaticParams() {
  return getPublishedCafes().then((cafes) => cafes.map((cafe) => ({
    slug: cafe.slug,
  })))
}

export async function generateMetadata({
  params,
}: CafePageProps): Promise<Metadata> {
  const { slug } = await params
  const cafe = await getPublishedCafeBySlug(slug)

  if (!cafe) {
    return {
      title: "Cafetería no encontrada",
    }
  }

  const title = `${cafe.name} en ${cafe.commune}`

  return {
    title,
    description: cafe.description,
    alternates: {
      canonical: cafePath(cafe),
    },
    openGraph: {
      type: "article",
      url: cafePath(cafe),
      siteName: siteConfig.name,
      title,
      description: cafe.description,
      locale: siteConfig.locale,
      images: [
        {
          url: cafeImageUrl(cafe),
          alt: `${cafe.name}, cafetería en ${cafe.commune}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title,
      description: cafe.description,
      images: [cafeImageUrl(cafe)],
    },
  }
}

export default async function CafePage({ params }: CafePageProps) {
  const { slug } = await params
  const cafe = await getPublishedCafeBySlug(slug)

  if (!cafe) {
    notFound()
  }
  const [visibleReviews, viewerState, activeEvents] = cafe.id
    ? await Promise.all([
        getVisibleCafeReviews(cafe.id),
        getViewerCafeState(cafe.id),
        getActiveEventsForCafe(cafe.id, cafe.workspaceId),
      ])
    : [
        [],
        {
          isSignedIn: false,
          isFavorite: false,
          ownReview: null,
          canSubmitReview: false,
          nextReviewAt: null,
        },
        [],
      ]
  const website = cafe.socialLinks?.find((link) => link.platform === "website")
  const hoursText = cafe.hoursText?.trim()
  const highlightedEvent = activeEvents[0]
  const highlightedEventIsHappening = highlightedEvent
    ? isEventHappeningNow(highlightedEvent.startsAt, highlightedEvent.endsAt)
    : false
  return (
    <main className="min-h-svh bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createCafeStructuredData(cafe)),
        }}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <Button
          className="w-fit"
          nativeButton={false}
          render={<Link href="/" />}
          variant="ghost"
          size="sm"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al catálogo
        </Button>

        {highlightedEvent ? (
          <Link
            className={cn(
              "group flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-colors sm:flex-row sm:items-center sm:justify-between",
              highlightedEventIsHappening
                ? "border-emerald-300/80 bg-emerald-100/80 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100 dark:hover:bg-emerald-400/15"
                : "border-amber-300/70 bg-amber-100/75 text-amber-950 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/15"
            )}
            href={`/eventos/${highlightedEvent.slug}`}
          >
            <div className="flex min-w-0 gap-3">
              <div
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-sm",
                  highlightedEventIsHappening ? "bg-emerald-500" : "bg-amber-500"
                )}
              >
                <SparklesIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {highlightedEventIsHappening
                    ? `Ocurriendo ahora en ${cafe.name}`
                    : `Evento activo en ${cafe.name}`}
                </p>
                <p className="mt-1 truncate text-sm">
                  {highlightedEvent.title}
                  {highlightedEvent.subtitle ? ` • ${highlightedEvent.subtitle}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm font-medium">
              <CalendarClockIcon className="size-4" />
              {highlightedEventIsHappening
                ? `Termina ${formatEventDate(highlightedEvent.endsAt)}`
                : formatEventDate(highlightedEvent.startsAt)}
              <ExternalLinkIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{cafe.commune}</Badge>
                {cafe.features.map((feature) => (
                  <Badge key={feature.slug}>{feature.label}</Badge>
                ))}
                {cafe.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">
                  {cafe.name}
                </h1>
                {cafe.id ? (
                  <FavoriteButton
                    cafeId={cafe.id}
                    initialFavorite={viewerState.isFavorite}
                    isSignedIn={viewerState.isSignedIn}
                  />
                ) : null}
                {cafe.verificationStatus === "verified" && (
                  <Badge className="h-7" variant="secondary">
                    <BadgeCheckIcon data-icon="inline-start" />
                    Verificado
                  </Badge>
                )}
              </div>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {cafe.description}
              </p>
            </div>

            <CafeGallery
              name={cafe.name}
              images={cafe.imagePlaceholders}
              itemClassName="min-h-[26rem]"
              showAllPhotosCta
              loadImageEager
            />
            <CafeEngagement
              approvedReviews={visibleReviews}
              cafeId={cafe.id}
              cafeSlug={cafe.slug}
              viewerState={viewerState}
            />
          </div>

          <Card className="rounded-lg lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Datos prácticos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="text-sm font-medium">Ideal para</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cafe.features.map((feature) => (
                    <Badge key={feature.slug} variant="secondary">
                      {feature.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              {cafe.verificationStatus !== "verified" && cafe.workspaceId && (
                <>
                  <div className="rounded-lg border border-dashed bg-muted/30 p-4">
                    <p className="text-sm font-medium">¿Eres dueño?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Verifica este negocio y obten acceso para actualizar la información y destacarlo
                      como una cafetería verificada en coffee index!
                    </p>
                    <Button
                      className="mt-3"
                      nativeButton={false}
                      render={<Link href={`/claim/${cafe.workspaceId}`} />}
                      variant="outline"
                      size="sm"
                    >
                      Verificar{" "}
                      <VerifiedIcon className="text-[#3295F6]" data-icon="inline-end" />
                    </Button>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <p className="text-sm font-medium">Dirección</p>
                <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                  {cafe.addresses.map((address) => (
                    <span className="flex items-center gap-2" key={address}>
                      <MapPinIcon className="mt-0.5 shrink-0" />
                      {address}
                    </span>
                  ))}
                </div>
              </div>
              <Separator />
              {hoursText && (
                <>
                  <div>
                    <p className="text-sm font-medium">Horarios</p>
                    <div className="mt-2 flex flex-col gap-1 whitespace-pre-line text-sm text-muted-foreground">
                      {hoursText.split("\n").map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <p className="text-sm font-medium">Instagram</p>
                <Button
                  className="mt-2"
                  nativeButton={false}
                  render={
                    <a
                      href={instagramUrl(cafe.instagram)}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  variant="outline"
                  size="sm"
                >
                  {cafe.instagram}
                  <ExternalLinkIcon data-icon="inline-end" />
                </Button>
              </div>
              {website?.url && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <Button
                      className="mt-2"
                      nativeButton={false}
                      render={
                        <a
                          href={website.url}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                      variant="outline"
                      size="sm"
                    >
                      <GlobeIcon data-icon="inline-start" />
                      Sitio web
                      <ExternalLinkIcon data-icon="inline-end" />
                    </Button>
                  </div>
                </>
              )}
              <Separator />
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Ubicación</p>
                <CafeMap
                  addresses={cafe.addresses}
                  className="mt-4 h-48"
                  name={cafe.name}
                />
              <div className="mt-3 flex flex-col gap-2">
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
            </CardContent>
          </Card>
          {/* refact this later for better mobile layout */}
          <CafeEngagement
            approvedReviews={visibleReviews}
            cafeId={cafe.id}
            cafeSlug={cafe.slug}
            viewerState={viewerState}
            isMobile
          />
        </section>
      </div>
    </main>
  )
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function isEventHappeningNow(startsAt: string, endsAt: string) {
  const now = Date.now()

  return new Date(startsAt).getTime() <= now && now <= new Date(endsAt).getTime()
}
