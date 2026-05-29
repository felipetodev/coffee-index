
"use client"

import {
  OrganizationSwitcher,
  SignInButton,
  UserButton,
  useAuth,
  useOrganizationList,
} from "@clerk/nextjs"
import { CircleUserRoundIcon } from "lucide-react"

import { EventNotificationsBell } from "@/components/event-notifications-bell"
import { Button } from "@/components/ui/button"

export function AuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return null
  }

  return <ClerkAuthControls />
}

function ClerkAuthControls() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button
          aria-label="Sign in to your account"
          className="h-10 rounded-full size-8 shadow-sm"
          size="sm"
          variant="outline"
        >
          <CircleUserRoundIcon className="size-5" />
        </Button>
      </SignInButton>
    )
  }

  return <ClerkOrganizationControls />
}

function ClerkOrganizationControls() {
  const { userMemberships } = useOrganizationList({
    userMemberships: true,
  })
  const showOrganizationSwitcher =
    Boolean(userMemberships.data?.length) || userMemberships.isLoading

  if (!showOrganizationSwitcher) {
    return (
      <div className="flex items-center gap-2">
        <EventNotificationsBell />
        <UserButton />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-full border bg-background px-2 py-1 shadow-sm">
      <OrganizationSwitcher
        hidePersonal={false}
        afterSelectOrganizationUrl="/dashboard"
        appearance={{
          elements: {
            organizationSwitcherPopoverActionButton__createOrganization: {
              display: "none",
            },
          },
        }}
      />
      <EventNotificationsBell />
      <UserButton />
    </div>
  )
}
