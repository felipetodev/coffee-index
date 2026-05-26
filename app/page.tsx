import { auth } from "@clerk/nextjs/server"

import { CafeCatalog } from "@/components/cafe-catalog"
import { canUserAddLocal } from "@/lib/auth/platform-admin"
import { getPublishedCafes } from "@/lib/data/cafes"
import { createCafeItemListStructuredData } from "@/lib/seo"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page() {
  const { userId } = await auth()
  const cafes = await getPublishedCafes()
  const canAddLocal = await canUserAddLocal(userId)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createCafeItemListStructuredData(cafes)),
        }}
      />
      <CafeCatalog cafes={cafes} canAddLocal={canAddLocal} />
    </>
  )
}
