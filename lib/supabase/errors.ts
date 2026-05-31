type SanitizedMetadataValue =
  | string
  | number
  | boolean
  | null
  | SanitizedMetadataValue[]

// TODO: Replace console.error with an observability platform
export function logSupabaseError(
  context: string,
  error: { message: string; code?: string } | null,
  metadata?: Record<string, unknown>
) {
  if (!error) {
    return
  }

  if (process.env.NODE_ENV === "development") {
    console.error(
      `[Supabase] ${context} failed:`,
      error.message,
      metadata ?? ""
    )
  } else {
    console.error(`[Supabase] ${context} failed:`, {
      code: error.code,
      metadata,
    })
    void notifyTelegramSupabaseError(context, error, metadata)
  }
}

async function notifyTelegramSupabaseError(
  context: string,
  error: { message: string; code?: string },
  metadata?: Record<string, unknown>
) {
  const alertSecret = process.env.TELEGRAM_ALERT_SECRET

  if (!alertSecret) {
    return
  }

  await fetch("/api/notifications/telegram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telegram-alert-secret": alertSecret,
    },
    body: JSON.stringify({
      source: "Supabase",
      context,
      code: error.code,
      message: error.message,
      metadata: sanitizeMetadata(metadata),
    }),
  }).catch((notificationError) => {
    console.error("[Supabase] Telegram notification failed:", notificationError)
  })
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      isSensitiveMetadataKey(key) ? "[redacted]" : sanitizeMetadataValue(value),
    ])
  )
}

function sanitizeMetadataValue(value: unknown): SanitizedMetadataValue {
  if (typeof value === "string") {
    return value.length > 300 ? `${value.slice(0, 300)}...` : value
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map(sanitizeMetadataValue)
  }

  if (typeof value === "object") {
    return "[object]"
  }

  return String(value)
}

function isSensitiveMetadataKey(key: string) {
  return /(token|secret|password|authorization|cookie|key|email|phone)/i.test(key)
}

export function formatSupabaseSetupError(error: { message: string; code?: string }) {
  if (process.env.NODE_ENV !== "development") {
    return "No pudimos completar la acción. Inténtalo nuevamente o contáctanos si el problema persiste."
  }

  if (
    error.message.includes("schema cache") ||
    error.message.includes("Could not find the table")
  ) {
    return [
      "Supabase no tiene las tablas del backend aplicadas todavía.",
      "Ejecuta las migraciones en supabase/migrations/0001_workspaces_cafes.sql y supabase/migrations/0002_social_accounts.sql.",
      "Si ya las ejecutaste, recarga el schema cache de PostgREST desde Supabase Dashboard o espera unos segundos y vuelve a intentar.",
    ].join(" ")
  }

  return error.message
}
