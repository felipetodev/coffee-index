import type { CafeSubmissionPayload } from "@/lib/types"

export function normalizeSocialHandle(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ""
  }

  try {
    const url = new URL(trimmedValue)
    const pathHandle = url.pathname.split("/").filter(Boolean)[0] ?? ""

    return pathHandle.replace("@", "").toLowerCase()
  } catch {
    return trimmedValue.replace("@", "").toLowerCase()
  }
}

export function normalizeInstagramInput(value: string) {
  const handle = normalizeSocialHandle(value)

  return handle ? `@${handle}` : ""
}

export function socialHandle(value: string) {
  if (value.startsWith("http")) {
    const normalizedHandle = normalizeSocialHandle(value)

    return normalizedHandle ? `@${normalizedHandle}` : null
  }

  return normalizeInstagramInput(value)
}

export function socialUrl(platform: "instagram" | "tiktok" | "x", value: string) {
  if (value.startsWith("http")) {
    return value
  }

  const handle = normalizeSocialHandle(value)

  if (platform === "instagram") {
    return `https://instagram.com/${handle}`
  }

  if (platform === "tiktok") {
    return `https://www.tiktok.com/@${handle}`
  }

  return `https://x.com/${handle}`
}

export function createSocialLinkRows(cafeId: string, payload: CafeSubmissionPayload) {
  return [
    payload.website
      ? {
          cafe_id: cafeId,
          platform: "website",
          url: payload.website,
          handle: null,
          label: "Website",
        }
      : null,
    {
      cafe_id: cafeId,
      platform: "instagram",
      url: socialUrl("instagram", payload.instagram),
      handle: socialHandle(payload.instagram),
      normalized_handle: normalizeSocialHandle(payload.instagram),
      label: "Instagram",
    },
    payload.tiktok
      ? {
          cafe_id: cafeId,
          platform: "tiktok",
          url: socialUrl("tiktok", payload.tiktok),
          handle: socialHandle(payload.tiktok),
          normalized_handle: normalizeSocialHandle(payload.tiktok),
          label: "TikTok",
        }
      : null,
    payload.x
      ? {
          cafe_id: cafeId,
          platform: "x",
          url: socialUrl("x", payload.x),
          handle: socialHandle(payload.x),
          normalized_handle: normalizeSocialHandle(payload.x),
          label: "X",
        }
      : null,
    payload.otherSocial
      ? {
          cafe_id: cafeId,
          platform: "other",
          url: payload.otherSocial.startsWith("http") ? payload.otherSocial : "",
          handle: payload.otherSocial.startsWith("http")
            ? null
            : socialHandle(payload.otherSocial),
          label: "Otro",
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row))
}
