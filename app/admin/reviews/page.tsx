import Image from "next/image"
import Link from "next/link"
import { ExternalLinkIcon, StarIcon } from "lucide-react"

import { approveReviewAction, rejectReviewAction } from "@/app/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPendingAdminReviews } from "@/lib/data/reviews"
import { cn } from "@/lib/utils"

export default async function AdminReviewsPage() {
  const reviews = await getPendingAdminReviews()

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-medium">Reviews pendientes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprueba o rechaza reseñas antes de hacerlas visibles públicamente.
        </p>
      </div>
      <div className="grid gap-4">
        {reviews.map((review) => (
          <Card className="rounded-lg" key={review.id}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{review.cafeName}</CardTitle>
                <Button
                  className="mt-2"
                  nativeButton={false}
                  render={<Link href={`/cafeterias/${review.cafeSlug}`} />}
                  size="sm"
                  variant="outline"
                >
                  Ver ficha
                  <ExternalLinkIcon data-icon="inline-end" />
                </Button>
              </div>
              <Badge variant="secondary">Pendiente</Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1 text-sm text-muted-foreground">
                <p>Autor: {review.authorClerkUserId}</p>
                <p>Enviada: {formatDate(review.createdAt)}</p>
              </div>
              <div className="flex gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((value) => (
                  <StarIcon
                    className={cn("size-4", value <= review.rating && "fill-current")}
                    key={value}
                  />
                ))}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{review.body}</p>
              {review.media.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {review.media.map((media) => (
                    <div
                      className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
                      key={media.id}
                    >
                      <Image
                        alt={media.alt}
                        className="object-cover"
                        fill
                        sizes="(min-width: 640px) 33vw, 100vw"
                        src={media.url}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <form action={approveReviewAction}>
                  <input name="reviewId" type="hidden" value={review.id} />
                  <Button type="submit">Aprobar</Button>
                </form>
                <form action={rejectReviewAction}>
                  <input name="reviewId" type="hidden" value={review.id} />
                  <Button type="submit" variant="destructive">
                    Rechazar
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <Card className="rounded-lg border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No hay reviews pendientes.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}
