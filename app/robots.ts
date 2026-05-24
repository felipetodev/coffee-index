import { siteConfig } from "@/lib/seo"
import type { MetadataRoute } from "next"

const siteUrl = siteConfig.url

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
