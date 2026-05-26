import type { CafeImage } from "@/lib/cafes"

export type WorkspaceStatus = "seeded" | "active" | "suspended" | "archived"

export type VerificationStatus =
  | "unverified"
  | "claim_pending"
  | "verified"
  | "rejected"

export type CafePublicationStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived"

export type SubmissionStatus = "pending" | "approved" | "rejected" | "converted"

export type ClaimStatus = "pending" | "approved" | "rejected"

export type EventStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "cancelled"

export type CafeFeatureViewModel = {
  slug: string
  label: string
}

export type CafeViewModel = {
  id?: string
  workspaceId?: string
  slug: string
  name: string
  addresses: string[]
  commune: string
  instagram: string
  description: string
  features: CafeFeatureViewModel[]
  tags: string[]
  imagePlaceholders: CafeImage[]
  workspaceStatus?: WorkspaceStatus
  verificationStatus: VerificationStatus
  status: CafePublicationStatus
  contactEmail?: string | null
  contactPhone?: string | null
  hoursText?: string | null
  socialLinks?: CafeSocialLinkViewModel[]
}

export type CafeSocialLinkViewModel = {
  platform: string
  url: string
  handle: string | null
  label?: string | null
}

export type WorkspaceViewModel = {
  id: string
  clerkOrgId: string | null
  slug: string
  name: string
  status: WorkspaceStatus
  verificationStatus: VerificationStatus
}

export type CafeSubmissionViewModel = {
  id: string
  requesterClerkUserId: string
  status: SubmissionStatus
  payload: CafeSubmissionPayload
  createdAt: string
  workspaceId?: string | null
  cafeId?: string | null
}

export type ClaimRequestViewModel = {
  id: string
  workspaceId: string
  requesterClerkUserId: string
  proof: string
  status: ClaimStatus
  createdAt: string
  cafeName?: string
  workspaceName?: string
}

export type CafeEventViewModel = {
  id: string
  workspaceId: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string | null
  status: EventStatus
}

export type CafeSubmissionPayload = {
  name: string
  commune: string
  addresses: string[]
  description: string
  hours?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  instagram: string
  tiktok?: string
  x?: string
  otherSocial?: string
  features: string[]
  tags: string[]
  images?: CafeImage[]
}
