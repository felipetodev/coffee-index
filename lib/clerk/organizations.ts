import "server-only"

import { clerkClient } from "@clerk/nextjs/server"

import { hasClerkEnv } from "@/lib/env"

export async function createCafeOrganization(input: {
  name: string
  slug: string
  creatorClerkUserId: string
}) {
  if (!hasClerkEnv()) {
    return null
  }

  const clerk = await clerkClient()
  let organization

  try {
    organization = await clerk.organizations.createOrganization({
      name: input.name,
      slug: input.slug,
      createdBy: input.creatorClerkUserId,
    })
  } catch (error) {
    const existingOrganization = await getExistingOrganizationBySlug(input.slug)

    if (existingOrganization) {
      organization = existingOrganization
    } else if (!isForbiddenClerkError(error)) {
      throw error
    } else {
      organization = await clerk.organizations.createOrganization({
        name: input.name,
        slug: input.slug,
      })
    }
  }

  await upsertCafeOrganizationMembership({
    clerkOrgId: organization.id,
    clerkUserId: input.creatorClerkUserId,
    role: "org:cafe_owner",
  })

  return organization.id
}

export async function upsertCafeOrganizationMembership(input: {
  clerkOrgId: string | null
  clerkUserId: string
  role: string
}) {
  if (!hasClerkEnv() || !input.clerkOrgId) {
    return
  }

  const clerk = await clerkClient()

  try {
    await clerk.organizations.createOrganizationMembership({
      organizationId: input.clerkOrgId,
      userId: input.clerkUserId,
      role: input.role,
    })
  } catch {
    try {
      await clerk.organizations.createOrganizationMembership({
        organizationId: input.clerkOrgId,
        userId: input.clerkUserId,
        role: "org:admin",
      })
    } catch {
      try {
        await clerk.organizations.updateOrganizationMembership({
          organizationId: input.clerkOrgId,
          userId: input.clerkUserId,
          role: input.role,
        })
      } catch {
        await clerk.organizations.updateOrganizationMembership({
          organizationId: input.clerkOrgId,
          userId: input.clerkUserId,
          role: "org:admin",
        })
      }
    }
  }
}

export async function deleteCafeOrganization(clerkOrgId: string | null) {
  if (!hasClerkEnv() || !clerkOrgId) {
    return
  }

  const clerk = await clerkClient()

  try {
    await clerk.organizations.deleteOrganization(clerkOrgId)
  } catch (error) {
    if (!isNotFoundClerkError(error)) {
      throw error
    }
  }
}

async function getExistingOrganizationBySlug(slug: string) {
  if (!hasClerkEnv()) {
    return null
  }

  const clerk = await clerkClient()

  try {
    return await clerk.organizations.getOrganization({ slug })
  } catch {
    return null
  }
}

function isForbiddenClerkError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 403
  )
}

function isNotFoundClerkError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  )
}
