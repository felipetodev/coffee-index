"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { esES } from "@clerk/localizations"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return children
  }

  return <ClerkProvider localization={esES}>{children}</ClerkProvider>
}
