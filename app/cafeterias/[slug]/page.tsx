import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, ExternalLinkIcon, MapPinIcon } from "lucide-react"

import { CafeGallery } from "@/components/cafe-gallery"
import { CafeMap } from "@/components/cafe-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  cafeFeatureLabels,
  cafes,
  getCafeBySlug,
  googleMapsUrl,
  instagramUrl,
} from "@/lib/cafes"
import {
  cafeImageUrl,
  cafePath,
  createCafeStructuredData,
  siteConfig,
} from "@/lib/seo"

type CafePageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return cafes.map((cafe) => ({
    slug: cafe.slug,
  }))
}

export async function generateMetadata({
  params,
}: CafePageProps): Promise<Metadata> {
  const { slug } = await params
  const cafe = getCafeBySlug(slug)

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
  const cafe = getCafeBySlug(slug)

  if (!cafe) {
    notFound()
  }

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

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{cafe.commune}</Badge>
                {cafe.features.map((feature) => (
                  <Badge key={feature}>{cafeFeatureLabels[feature]}</Badge>
                ))}
                {cafe.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">
                {cafe.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {cafe.description}
              </p>
            </div>

            <CafeGallery
              name={cafe.name}
              images={cafe.imagePlaceholders}
              itemClassName="min-h-[22rem]"
              showAllPhotosCta
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
                    <Badge key={feature} variant="secondary">
                      {cafeFeatureLabels[feature]}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
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
        </section>
      </div>
    </main>
  )
}
