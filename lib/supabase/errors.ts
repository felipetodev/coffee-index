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
