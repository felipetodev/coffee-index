"use client"

import { useActionState, useEffect } from "react"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"

import {
  submitCafeAction,
  type SubmitCafeActionState,
} from "@/app/anade-tu-local/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const initialState: SubmitCafeActionState = {}

export function CafeSubmissionForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, isPending] = useActionState(
    submitCafeAction,
    initialState
  )

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }
  }, [state.error])

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Datos del local</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5">
          <Field label="Nombre del local" name="name" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Comuna" name="commune" required />
            <Field label="Email de contacto (Opcional)" name="contactEmail" type="email" />
          </div>
          <Field label="Teléfono de contacto (Opcional)" name="contactPhone" />
          <TextField
            label="Dirección o direcciones"
            name="addresses"
            placeholder="Una dirección por línea"
            required
          />
          <TextField label="Descripción" name="description" required />
          <TextField
            label="Horarios"
            name="hours"
            placeholder="Ej: Lun a Vie 08:00-19:00"
            required
          />
          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium">Redes y links</p>
              <p className="mt-1 text-sm text-destructive">
                El campo de Instagram es obligatorio para completar registro.
              </p>
            </div>
            <Field label="Website" name="website" type="url" placeholder="https://..." />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Instagram" name="instagram" placeholder="@tu_local" required />
              <Field label="TikTok" name="tiktok" placeholder="@tu_local" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="X (Twitter)" name="x" placeholder="@tu_local" />
              <Field label="Otro" name="otherSocial" placeholder="Link o usuario" />
            </div>
          </div>
          <Field label="Features" name="features" placeholder="wifi, enchufes, terraza" />
          <Field label="Tags" name="tags" placeholder="co-working, brunch, stand-up" />
          <Button className="w-fit" disabled={disabled || isPending} type="submit">
            <SendIcon data-icon="inline-start" />
            {isPending ? "Enviando..." : "Enviar local"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} type={type} placeholder={placeholder} required={required} />
    </label>
  )
}

function TextField({
  label,
  name,
  placeholder,
  required,
}: {
  label: string
  name: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <textarea
        className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}
