import type { MetadataRoute } from "next"

import { cafes } from "@/lib/cafes"
import { siteConfig } from "@/lib/seo"

const siteUrl = siteConfig.url

export default function sitemap(): MetadataRoute.Sitemap {
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
