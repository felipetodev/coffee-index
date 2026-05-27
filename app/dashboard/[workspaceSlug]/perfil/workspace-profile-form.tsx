"use client"

import { useActionState, useEffect, useState } from "react"
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  updateWorkspaceProfileAction,
  type WorkspaceProfileActionState,
} from "@/app/dashboard/[workspaceSlug]/perfil/actions"
import type { WorkspaceProfileData } from "@/app/dashboard/[workspaceSlug]/perfil/data"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const initialState: WorkspaceProfileActionState = {}

export function WorkspaceProfileForm({
  data,
}: {
  data: WorkspaceProfileData
}) {
  const [state, formAction, isPending] = useActionState(
    updateWorkspaceProfileAction,
    initialState
  )
  const [features, setFeatures] = useState(() => ensureOne(data.cafe.features))
  const [tags, setTags] = useState(() => ensureOne(data.cafe.tags))

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }

    if (state.success) {
      toast.success(state.success)
    }
  }, [state.error, state.success])

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Perfil público</CardTitle>
        <CardDescription>
          Los cambios se publican de inmediato en el catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5">
          <input name="workspaceSlug" type="hidden" value={data.workspace.slug} />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              defaultValue={data.cafe.name}
              disabled
              helpText="Para cambiar el nombre, contacta al Platform Admin."
              label="Nombre del local"
              name="lockedName"
            />
            <Field
              defaultValue={data.cafe.instagram}
              disabled
              helpText="Para cambiar Instagram, contacta al Platform Admin."
              label="Instagram"
              name="lockedInstagram"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              defaultValue={data.cafe.commune}
              label="Comuna"
              name="commune"
              required
            />
            <Field
              defaultValue={data.cafe.contactEmail}
              label="Email de contacto"
              name="contactEmail"
              type="email"
            />
          </div>

          <Field
            defaultValue={data.cafe.contactPhone}
            label="Teléfono de contacto"
            name="contactPhone"
          />
          <TextField
            defaultValue={data.cafe.addresses.join("\n")}
            label="Dirección o direcciones"
            name="addresses"
            placeholder="Una dirección por línea"
            required
          />
          <TextField
            defaultValue={data.cafe.description}
            label="Descripción"
            name="description"
            required
          />
          <TextField
            defaultValue={data.cafe.hoursText}
            label="Horarios"
            name="hoursText"
            placeholder="Ej: Lun a Vie 08:00-19:00"
          />

          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium">Redes y links</p>
            </div>
            <Field
              defaultValue={data.cafe.website}
              label="Website"
              name="website"
              placeholder="https://..."
              type="url"
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                defaultValue={data.cafe.tiktok}
                label="TikTok"
                name="tiktok"
                placeholder="@tu_local"
              />
              <Field
                defaultValue={data.cafe.x}
                label="X"
                name="x"
                placeholder="@tu_local"
              />
            </div>
            <Field
              defaultValue={data.cafe.otherSocial}
              label="Otro link o red"
              name="otherSocial"
              placeholder="https://... o @usuario"
            />
          </div>

          <DynamicList
            description="Agrega beneficios o atributos visibles en filtros y fichas."
            label="Features"
            name="features"
            onChange={setFeatures}
            placeholder="wifi, terraza, brunch..."
            values={features}
          />
          <DynamicList
            description="Agrega etiquetas editoriales o descriptivas del local."
            label="Tags"
            name="tags"
            onChange={setTags}
            placeholder="Especialidad, Barrio, Panadería..."
            values={tags}
          />

          <Button className="w-fit" disabled={isPending} type="submit">
            <SaveIcon data-icon="inline-start" />
            {isPending ? "Guardando..." : "Guardar perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DynamicList({
  description,
  label,
  name,
  onChange,
  placeholder,
  values,
}: {
  description: string
  label: string
  name: string
  onChange: (values: string[]) => void
  placeholder: string
  values: string[]
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-2">
        {values.map((value, index) => (
          <div className="grid grid-cols-[1fr_auto] gap-2" key={index}>
            <Input
              name={name}
              onChange={(event) => {
                onChange(replaceAt(values, index, event.currentTarget.value))
              }}
              placeholder={placeholder}
              value={value}
            />
            <Button
              aria-label={`Eliminar ${label.toLowerCase()} ${index + 1}`}
              onClick={() => onChange(removeAt(values, index))}
              size="icon"
              type="button"
              variant="outline"
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </div>
      <Button
        className="w-fit"
        onClick={() => onChange([...values, ""])}
        size="sm"
        type="button"
        variant="outline"
      >
        <PlusIcon data-icon="inline-start" />
        Agregar
      </Button>
    </div>
  )
}

function Field({
  defaultValue,
  disabled,
  helpText,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue?: string
  disabled?: boolean
  helpText?: string
  label: string
  name: string
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      {helpText && (
        <span className="text-xs font-normal text-muted-foreground">
          {helpText}
        </span>
      )}
    </label>
  )
}

function TextField({
  defaultValue,
  label,
  name,
  placeholder,
  required,
}: {
  defaultValue?: string
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
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}

function ensureOne(values: string[]) {
  return values.length > 0 ? values : [""]
}

function replaceAt(values: string[], index: number, value: string) {
  return values.map((item, itemIndex) => (itemIndex === index ? value : item))
}

function removeAt(values: string[], index: number) {
  const nextValues = values.filter((_, itemIndex) => itemIndex !== index)

  return ensureOne(nextValues)
}
