import type { NextRequest } from "next/server"

type TelegramNotificationPayload = {
  source?: string
  context?: string
  code?: string
  message?: string
  metadata?: Record<string, unknown>
}

const maxTelegramMessageLength = 3900

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_ALERT_SECRET
  const providedSecret = req.headers.get("x-telegram-alert-secret")

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ERROR_CHAT_ID

  if (!token || !chatId) {
    return new Response(null, { status: 204 })
  }

  let payload: TelegramNotificationPayload

  try {
    payload = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const text = buildTelegramMessage(payload)
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      text,
    }),
  })

  if (!response.ok) {
    return new Response("Telegram delivery failed", { status: 502 })
  }

  return new Response(null, { status: 204 })
}

function buildTelegramMessage(payload: TelegramNotificationPayload) {
  const lines = [
    `[${payload.source ?? "App"}] ${payload.context ?? "Unknown context"}`,
    payload.code ? `Code: ${payload.code}` : null,
    payload.message ? `Message: ${payload.message}` : null,
    payload.metadata ? `Metadata: ${safeJson(payload.metadata)}` : null,
  ].filter((line): line is string => Boolean(line))
  const text = lines.join("\n")

  return text.length > maxTelegramMessageLength
    ? `${text.slice(0, maxTelegramMessageLength)}...`
    : text
}

function safeJson(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value)
  } catch {
    return "[unserializable]"
  }
}
