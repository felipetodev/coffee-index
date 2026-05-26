import { instagramUrl } from "@/lib/cafes"
import type { CafeViewModel } from "@/lib/types"

export const siteConfig = {
  url: "https://coffeeindex.vercel.app",
  name: "The Coffee Index",
  title: "The Coffee Index | Cafeterías en Chile",
  description:
    "Descubre cafeterías de especialidad en Santiago de Chile con fotos, direcciones, mapas, filtros por ambiente y fichas detalladas.",
  locale: "es_CL",
  language: "es-CL",
  twitterHandle: "@thecoffeeindex",
  themeColor: "#f8f5ef",
}

export function absoluteUrl(path = "") {
  return new URL(path, siteConfig.url).toString()
}

export function cafePath(cafe: Pick<CafeViewModel, "slug">) {
  return `/cafeterias/${cafe.slug}`
}

export function cafeUrl(cafe: Pick<CafeViewModel, "slug">) {
  return absoluteUrl(cafePath(cafe))
}

export function cafeImageUrl(cafe: Pick<CafeViewModel, "imagePlaceholders">) {
  const image = cafe.imagePlaceholders[0]?.src

  return image ? absoluteUrl(image) : absoluteUrl("/opengraph-image")
}

export function createWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

export function createCafeStructuredData(cafe: CafeViewModel) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: cafe.name,
    description: cafe.description,
    url: cafeUrl(cafe),
    address: cafe.addresses[0],
    image: cafe.imagePlaceholders
      .map((image) => (image.src ? absoluteUrl(image.src) : undefined))
      .filter(Boolean),
    sameAs: instagramUrl(cafe.instagram),
  }
}

export function createCafeItemListStructuredData(cafes: CafeViewModel[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Cafeterías de especialidad en Santiago de Chile",
    itemListElement: cafes.map((cafe, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: cafeUrl(cafe),
      item: createCafeStructuredData(cafe),
    })),
  }
}
