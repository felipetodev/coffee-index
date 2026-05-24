import { CafeCatalog } from "@/components/cafe-catalog"
import { cafes } from "@/lib/cafes"
import { createCafeItemListStructuredData } from "@/lib/seo"

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createCafeItemListStructuredData(cafes)),
        }}
      />
      <CafeCatalog cafes={cafes} />
    </>
  )
}
