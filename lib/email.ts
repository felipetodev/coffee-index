import "server-only"

import { Resend } from "resend"

type EmailInput = {
  to: string
  subject: string
  html: string
}

export async function sendTransactionalEmail(input: EmailInput) {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: "The Coffee Index <noreply@coffeeindex.cl>",
    ...input,
  })

  return { skipped: false }
}
