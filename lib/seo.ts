import type { Cafe } from "@/lib/cafes"
import { instagramUrl } from "@/lib/cafes"

export const siteConfig = {
  url: "https://coffeeindex.vercel.app",
  name: "The Coffee Index",
  title: "The Coffee Index | Cafeterías en Chile",
  description:
    "Descubre cafeterías de especialidad en Santiago de Chile con fotos, direcciones, mapas, filtros por ambiente y fichas curatoriales.",
  locale: "es_CL",
  language: "es-CL",
  twitterHandle: "@thecoffeeindex",
  themeColor: "#f8f5ef",
}

export function absoluteUrl(path = "") {
  return new URL(path, siteConfig.url).toString()
}

export function cafePath(cafe: Cafe) {
  return `/cafeterias/${cafe.slug}`
}

export function cafeUrl(cafe: Cafe) {
  return absoluteUrl(cafePath(cafe))
}

export function cafeImageUrl(cafe: Cafe) {
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

export function createCafeStructuredData(cafe: Cafe) {
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

export function createCafeItemListStructuredData(cafes: Cafe[]) {
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
