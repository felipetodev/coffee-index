import Image from "next/image"

import { cn } from "@/lib/utils"

type CafeVisualProps = {
  label: string
  name: string
  src?: string
  className?: string
}

export function CafeVisual({ label, name, src, className }: CafeVisualProps) {
  if (src) {
    return (
      <div
        className={cn(
          "relative flex min-h-48 overflow-hidden rounded-lg border bg-muted",
          className
        )}
      >
        <Image
          src={src}
          alt={`${name}: ${label}`}
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 390px, (min-width: 640px) 50vw, 100vw"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex min-h-48 overflow-hidden rounded-lg border bg-muted text-muted-foreground",
        className
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0_48%,var(--border)_48%_52%,transparent_52%_100%)] opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--background)_0,transparent_32%),radial-gradient(circle_at_80%_0%,var(--muted)_0,transparent_35%)]" />
      <div className="relative flex w-full flex-col justify-end p-4">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 max-w-[18rem] text-lg font-medium leading-tight text-foreground">
            {name}
          </p>
        </div>
      </div>
    </div>
  )
}
