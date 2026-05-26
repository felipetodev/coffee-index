"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireCurrentUserId } from "@/lib/auth/platform-admin"
import {
  assertNoCafeDuplicate,
  checkCafeDuplicateByInstagram,
} from "@/lib/data/duplicate-cafes"
import { sendTransactionalEmail } from "@/lib/email"
import { slugify } from "@/lib/slug"
import { normalizeInstagramInput, normalizeSocialHandle } from "@/lib/social-links"
import { formatSupabaseSetupError } from "@/lib/supabase/errors"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type { CafeSubmissionPayload } from "@/lib/types"

export type SubmitCafeActionState = {
  error?: string
}

const submissionSchema = z.object({
  name: z.string().trim().min(2),
  commune: z.string().trim().min(2),
  addresses: z.string().trim().min(5),
  description: z.string().trim().min(2),
  hours: z.string().trim().min(2),
  contactEmail: z.union([z.email(), z.literal("")]).optional(),
  contactPhone: z.string().trim().optional(),
  website: z.union([z.url(), z.literal("")]).optional(),
  instagram: z.string().trim().min(2),
  tiktok: z.string().trim().optional(),
  x: z.string().trim().optional(),
  otherSocial: z.string().trim().optional(),
  features: z.string().trim().optional(),
  tags: z.string().trim().optional(),
})

const duplicateCafeMessage =
  "Ya existe un local o una solicitud activa con ese Instagram."

export async function submitCafeAction(
  _previousState: SubmitCafeActionState,
  formData: FormData
): Promise<SubmitCafeActionState> {
  const requesterClerkUserId = await requireCurrentUserId()
  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return { error: "Supabase admin no está configurado." }
  }

  const parsedResult = submissionSchema.safeParse({
    name: formData.get("name"),
    commune: formData.get("commune"),
    addresses: formData.get("addresses"),
    description: formData.get("description"),
    hours: formData.get("hours"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    website: formData.get("website"),
    instagram: formData.get("instagram"),
    tiktok: formData.get("tiktok"),
    x: formData.get("x"),
    otherSocial: formData.get("otherSocial"),
    features: formData.get("features"),
    tags: formData.get("tags"),
  })

  if (!parsedResult.success) {
    return { error: "Revisa los campos requeridos antes de enviar el local." }
  }

  const parsed = parsedResult.data
  const payload: CafeSubmissionPayload = {
    name: parsed.name,
    commune: parsed.commune,
    addresses: splitLines(parsed.addresses),
    description: parsed.description,
    hours: parsed.hours,
    contactEmail: emptyToUndefined(parsed.contactEmail),
    contactPhone: emptyToUndefined(parsed.contactPhone),
    website: emptyToUndefined(parsed.website),
    instagram: normalizeInstagramInput(parsed.instagram),
    tiktok: emptyToUndefined(parsed.tiktok),
    x: emptyToUndefined(parsed.x),
    otherSocial: emptyToUndefined(parsed.otherSocial),
    features: splitCommaList(parsed.features),
    tags: splitCommaList(parsed.tags),
  }
  const submissionSlug = slugify(payload.name)
  const instagramHandle = normalizeSocialHandle(payload.instagram)

  try {
    assertNoCafeDuplicate(await checkCafeDuplicateByInstagram(payload.instagram))
  } catch {
    return { error: duplicateCafeMessage }
  }

  const { error } = await supabase.from("cafe_submissions").insert({
    requester_clerk_user_id: requesterClerkUserId,
    submission_slug: submissionSlug,
    instagram_handle: instagramHandle,
    status: "pending",
    payload,
  })

  if (error) {
    return { error: formatSupabaseSetupError(error) }
  }

  if (payload.contactEmail) {
    await sendTransactionalEmail({
      to: payload.contactEmail,
      subject: "Recibimos tu local en The Coffee Index",
      html: `<p>Hola, recibimos la información de ${payload.name}. Revisaremos el local y te avisaremos cuando sea aprobado.</p>`,
    })
  }

  revalidatePath("/admin/submissions")
  redirect("/anade-tu-local?submitted=1")
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitCommaList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function emptyToUndefined(value?: string) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}
