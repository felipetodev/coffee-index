# AGENTS.md

## Project Context

The Coffee Index is a directory of coffee shops in Chile.
Next.js + Clerk + Supabase backend with cafe workspaces, owner claims, submissions, admin review, verified cafe badges and more.

Use the existing UI conventions: App Router, Server Components by default, shadcn-style components in `components/ui`, Tailwind v4, lucide icons, and compact operational UI rather than marketing-heavy pages.

## Current Architecture

- Public catalog routes read from Supabase through `lib/data/cafes.ts`.
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
- `lib/data/cafes.ts`: public cafe data access from Supabase.
- `lib/data/admin.ts`: admin/workspace data reads.
- `lib/data/duplicate-cafes.ts`: duplicate checks for cafe submissions.
- `lib/data/events.ts`: event data access with public and authenticated patterns.
- `lib/data/reviews.ts`: review and favorite data access with public and authenticated patterns.
- `lib/supabase/server.ts`: public, token, authenticated, and admin Supabase clients.
- `lib/supabase/errors.ts`: Supabase error logging with TODO for observability platform.
- `lib/auth/platform-admin.ts`: platform admin checks.
- `app/api/webhooks/clerk/route.ts`: verified Clerk webhook handler.
- `app/anade-tu-local/page.tsx`: authenticated submission form.
- `app/anade-tu-local/actions.ts`: creates `cafe_submissions`.
- `app/claim/[workspaceId]/page.tsx`: claim request form.
- `app/admin/actions.ts`: approve/reject submissions and claims.
- `app/admin/*`: initial platform admin screens.
- `app/dashboard/*`: initial workspace shell.
- `supabase/migrations/0001_workspaces_cafes.sql`: schema, enums, indexes, RLS, storage buckets.
- `supabase/migrations/0011_workspace_events_feed.sql`: event feed, media, tags, comments, notifications, and related RLS.
- `supabase/migrations/0012_security_hardening.sql`: minimal anon/authenticated grants and fixed `current_clerk_user_id()` search path.
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
- `event_media`
- `event_tags`
- `event_comments`
- `event_notifications`
- `cafe_reviews`
- `cafe_review_media`
- `cafe_favorites`
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
- Treat Supabase security as two layers: `GRANT` controls whether a role can attempt an operation, and RLS controls which rows are visible/mutable. Keep both minimal.
- Keep `anon` and `authenticated` table grants aligned with `supabase/migrations/0012_security_hardening.sql`; do not grant broad `update`, `delete`, or `truncate` privileges just to fix an access issue.
- `public.current_clerk_user_id()` must keep a fixed empty `search_path` to satisfy Supabase security advisors.

## Supabase Request Security Model

Use the right Supabase client for the request shape:

- Public catalog/feed/detail reads should use `createPublicSupabaseClient()` only when the matching RLS policy intentionally allows `anon` access. Examples: published cafes, published events, approved media, visible event comments, approved reviews.
- Authenticated user-owned reads/writes should use server-side Clerk identity. Until Clerk Third-Party Auth is fully configured in both Clerk and Supabase, prefer `createSupabaseAdminClient()` plus explicit `clerk_user_id`/`workspace_id` filters in server-only code.
- `createAuthenticatedSupabaseClient()` is only safe after Clerk Third-Party Auth is configured. It returns `null` when no Clerk token exists and should not silently fall back to anon behavior.
- Duplicate checks for submissions must use `createSupabaseAdminClient()` in `lib/data/duplicate-cafes.ts` because they must see active submissions across users without exposing `cafe_submissions` publicly.
- Profile lookups for review/comment authors currently use admin server-side reads because `profiles` only allows users to read their own profile. Do not make `profiles` public unless replacing it with a deliberately minimal public profile view/table.
- Admin/workspace reads and all moderation, approval, deletion, audit, claim, and workspace mutation flows must stay server-side with service role plus Clerk-derived authorization checks.
- Never use service role in Client Components, route payloads, browser code, or public env vars. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is safe for public reads only because RLS and minimal grants remain the authority.

TODO security/performance follow-ups:

- Replace admin-side public author profile lookups with a deliberately minimal public profile view/table, or denormalized author display fields on reviews/comments.
- Add a catalog index for published cafe sorting, such as `cafes(name) where status = 'published'` or `(status, name)`, if the public catalog grows.

## Current Feature State

Implemented:

- Clerk provider and auth routes.
- Supabase clients and env helpers.
- Public data access from Supabase.
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
- Clerk Third-Party Auth integration with Supabase (currently `createAuthenticatedSupabaseClient()` is unusable until configured in both Clerk and Supabase dashboards).

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
- Public pages require Supabase env vars to display cafe data; there is no static fallback.
- **Supabase migrations must use sequential numbering.** The CLI default (`supabase migration new`) generates a timestamped filename (e.g. `20260529030220_name.sql`). Before committing, rename it to the next sequential number (e.g. `0011_name.sql`) to match the existing convention in `supabase/migrations/`.
