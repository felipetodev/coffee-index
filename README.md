# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Workspaces backend

This app is prepared for Clerk + Supabase.

1. Copy `.env.example` to `.env.local`.
2. Enable Clerk Organizations with membership optional.
3. Run the SQL migration in `supabase/migrations/0001_workspaces_cafes.sql`.
4. Add at least one row to `platform_admins` for your Clerk user id.
5. Seed the current static cafés with `scripts/seed-static-cafes.ts` using a TS runner.

Without Supabase configured, the public catalog falls back to `lib/cafes.ts`.
