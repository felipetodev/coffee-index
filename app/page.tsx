import { CafeCatalog } from "@/components/cafe-catalog"
import { cafes } from "@/lib/cafes"

export default function Page() {
  return <CafeCatalog cafes={cafes} />
}
