# AGENTS.md

## Project Context

The Coffee Index is a directory of coffee shops in Chile.
Next.js + Clerk + Supabase backend with cafe workspaces, owner claims, submissions, admin review, verified cafe badges and more.

Use the existing UI conventions: App Router, Server Components by default, shadcn-style components in `components/ui`, Tailwind v4, lucide icons, and compact operational UI rather than marketing-heavy pages.

## Current Architecture

- Public catalog routes read from Supabase through `lib/data/cafes.ts`.
- If Supabase env vars are missing, public cafe data falls back to `lib/cafes.ts`.
- `lib/cafes.ts` is now seed/fallback data, not the long-term source of truth.
- The public cafe contract is `CafeViewModel` in `lib/types.ts`.
- Clerk is used for auth, sessions, organizations, invitations, and workspace roles.
- Supabase is used for Postgres, Storage, RLS, submissions, claims, events, audit logs, and admin data.
- Clerk webhooks sync users, organizations, and memberships into Supabase.

## Important Files

- `app/page.tsx`: public catalog, now backed by `getPublishedCafes()`.
- `app/cafeterias/[slug]/page.tsx`: public cafe detail, verified badge, claim CTA.
- `components/cafe-catalog.tsx`: catalog UI, add-local CTA, auth controls, verified badges.
- `components/auth-provider.tsx`: wraps Clerk only when public Clerk env exists.
- `components/auth-controls.tsx`: sign-in/user/org UI.
- `proxy.ts`: Clerk route protection and public webhook exemption.
- `lib/data/cafes.ts`: public cafe data access with static fallback.
- `lib/data/admin.ts`: admin/workspace data reads.
- `lib/supabase/server.ts`: public, token, and admin Supabase clients.
- `lib/auth/platform-admin.ts`: platform admin checks.
- `app/api/webhooks/clerk/route.ts`: verified Clerk webhook handler.
- `app/anade-tu-local/page.tsx`: authenticated submission form.
- `app/anade-tu-local/actions.ts`: creates `cafe_submissions`.
- `app/claim/[workspaceId]/page.tsx`: claim request form.
- `app/admin/actions.ts`: approve/reject submissions and claims.
- `app/admin/*`: initial platform admin screens.
- `app/dashboard/*`: initial workspace shell.
- `supabase/migrations/0001_workspaces_cafes.sql`: schema, enums, indexes, RLS, storage buckets.
- `scripts/seed-static-cafes.ts`: seeds static cafes as unverified workspaces.
- `.env.example`: required environment variables.

## Environment

Required for full backend behavior:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Clerk Organizations must be enabled in membership optional mode.

## Data Model Summary

Supabase tables include:

- `profiles`
- `platform_admins`
- `workspaces`
- `workspace_memberships`
- `cafes`
- `cafe_locations`
- `cafe_hours`
- `cafe_media`
- `features`
- `cafe_features`
- `tags`
- `cafe_tags`
- `cafe_social_links`
- `cafe_submissions`
- `claim_requests`
- `events`
- `audit_logs`

Public reads should only expose published cafes/events and approved media. Workspace/admin mutations should stay server-side and use auth-derived identity, not client-supplied ownership.

## Roles and Permissions

Intended Clerk organization roles:

- `org:cafe_owner`
- `org:cafe_admin`
- `org:cafe_collaborator`

Intended custom permissions:

- `org:cafe_profile:edit`
- `org:cafe_media:manage`
- `org:cafe_hours:edit`
- `org:cafe_events:create`
- `org:cafe_events:approve`
- `org:cafe_members:manage`
- `org:cafe_workspace:delete`
- `org:cafe_workspace:transfer`

Platform admins are separate from cafe organization roles and are checked through the `platform_admins` table.

## Security Rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client components.
- Do not trust `workspace_id`, `clerk_org_id`, or role values sent from the client.
- In Server Actions, derive the current user/org from Clerk.
- For org-scoped dashboard routes, validate the active Clerk org slug against the URL slug when applicable.
- Webhook routes must stay public in `proxy.ts` but must verify signatures with `verifyWebhook(req)`.
- Clerk webhooks are eventually consistent; do not rely on them for synchronous onboarding completion.
- RLS is enabled in the migration. Any new table in an exposed schema must also get RLS and explicit policies.

## Current Feature State

Implemented:

- Clerk provider and auth routes.
- Supabase clients and env helpers.
- Public data access with static fallback.
- Verified badge support.
- “Añade tu local” authenticated submission flow.
- Claim request flow.
- Initial admin review screens for submissions and claims.
- Initial dashboard/workspace route structure.
- Clerk webhook sync endpoint.
- Supabase schema, RLS, indexes, and seed script.

Still intentionally thin:

- Workspace edit forms for profile, hours, photos, events, and team.
- Event moderation UI.
- Advanced workspace/admin filtering.
- Real image upload flow to Supabase Storage from submissions.
- Clerk role/permission provisioning automation.

## Verification Commands

Run these before handing off changes:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Notes:

- `pnpm build` may need network access because `next/font/google` fetches Geist fonts.
- `pnpm lint` currently reports warnings inside `.agents/skills`, not from app implementation.
- Dev server:

```bash
pnpm dev
```

Expected local URL:

```text
http://localhost:3000
```

## Workflow Notes

- Use `apply_patch` for manual edits.
- Prefer `rg` for searches.
- Keep `CafeViewModel` stable so UI components do not depend on raw Supabase rows.
- When adding Supabase tables, add indexes for common filters/joins and partial indexes for status-heavy queries.
- When adding client UI, avoid importing server-only helpers.
- Keep public pages usable without backend env vars by preserving the static fallback where practical.
- **Supabase migrations must use sequential numbering.** The CLI default (`supabase migration new`) generates a timestamped filename (e.g. `20260529030220_name.sql`). Before committing, rename it to the next sequential number (e.g. `0011_name.sql`) to match the existing convention in `supabase/migrations/`.
