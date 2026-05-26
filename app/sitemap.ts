import type { MetadataRoute } from "next"

import { getPublishedCafes } from "@/lib/data/cafes"
import { siteConfig } from "@/lib/seo"

const siteUrl = siteConfig.url

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cafes = await getPublishedCafes()

  return [
    {
      url: siteUrl,
      lastModified: new Date("2026-05-23"),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...cafes.map((cafe) => ({
      url: `${siteUrl}/cafeterias/${cafe.slug}`,
      lastModified: new Date("2026-05-23"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
