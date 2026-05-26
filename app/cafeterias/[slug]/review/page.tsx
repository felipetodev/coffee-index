import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { CafeReviewForm } from "@/app/cafeterias/[slug]/cafe-engagement"
import { Button } from "@/components/ui/button"
import { getPublishedCafeBySlug } from "@/lib/data/cafes"
import { getViewerCafeState } from "@/lib/data/reviews"

type CafeReviewPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function CafeReviewPage({ params }: CafeReviewPageProps) {
  const { slug } = await params
  const cafe = await getPublishedCafeBySlug(slug)

  if (!cafe || !cafe.id) {
    notFound()
  }

  const viewerState = await getViewerCafeState(cafe.id)

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Button
          className="w-fit"
          nativeButton={false}
          render={<Link href={`/cafeterias/${cafe.slug}`} />}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver a {cafe.name}
        </Button>
        <CafeReviewForm
          cafeId={cafe.id}
          cafeName={cafe.name}
          viewerState={viewerState}
        />
      </div>
    </main>
  )
}
