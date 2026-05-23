import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, ExternalLinkIcon, MapPinIcon } from "lucide-react"

import { CafeGallery } from "@/components/cafe-gallery"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cafes, getCafeBySlug, instagramUrl } from "@/lib/cafes"

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

  return {
    title: cafe.name,
    description: cafe.description,
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <Button
          className="w-fit"
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
            />
          </div>

          <Card className="rounded-lg lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Datos prácticos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="text-sm font-medium">Dirección</p>
                <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                  {cafe.addresses.map((address) => (
                    <span className="flex items-start gap-2" key={address}>
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
                <p className="text-sm font-medium">Geolocalización</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {cafe.locationPlaceholder}
                </p>
                <div className="mt-4 grid h-40 place-items-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
                  Mapa próximamente
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
