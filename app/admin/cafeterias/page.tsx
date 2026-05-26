import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { getPublishedCafes } from "@/lib/data/cafes"

export default async function AdminCafesPage() {
  await requirePlatformAdmin()
  const cafes = await getPublishedCafes()
  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-medium">Cafeterías publicadas</h2>
      <div className="grid gap-3">
        {cafes.map((cafe) => (
          <Card key={cafe.slug} className="rounded-lg">
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{cafe.name}</p>
                <p className="text-sm text-muted-foreground">{cafe.commune}</p>
              </div>
              <Badge
                variant={
                  cafe.verificationStatus === "verified"
                    ? "default"
                    : "secondary"
                }
              >
                {cafe.verificationStatus}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {cafes.length === 0 && (
          <Card className="rounded-lg border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No hay cafeterías publicadas todavía.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
