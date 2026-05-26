create extension if not exists "pgcrypto";

create type workspace_status as enum ('seeded', 'active', 'suspended', 'archived');
create type verification_status as enum ('unverified', 'claim_pending', 'verified', 'rejected');
create type workspace_created_from as enum ('static_seed', 'user_submission', 'admin');
create type cafe_publication_status as enum ('draft', 'pending_review', 'published', 'rejected', 'archived');
create type media_status as enum ('staging', 'approved', 'rejected');
create type submission_status as enum ('pending', 'approved', 'rejected', 'converted');
create type claim_status as enum ('pending', 'approved', 'rejected');
create type cafe_event_status as enum ('draft', 'pending_review', 'published', 'rejected', 'cancelled');

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create table public.profiles (
  clerk_user_id text primary key,
  email text,
  name text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  clerk_user_id text primary key references public.profiles(clerk_user_id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique,
  slug text not null unique,
  name text not null,
  type text not null default 'cafe',
  status workspace_status not null default 'seeded',
  verification_status verification_status not null default 'unverified',
  created_from workspace_created_from not null default 'static_seed',
  transferred_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  clerk_org_id text,
  clerk_user_id text not null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, clerk_user_id)
);

create table public.cafes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null unique,
  name text not null,
  commune text not null,
  description text not null,
  contact_email text,
  contact_phone text,
  status cafe_publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cafe_locations (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  address text not null,
  commune text,
  lat double precision,
  lng double precision,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.cafe_media (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  storage_bucket text,
  storage_path text not null,
  alt text,
  sort_order integer not null default 0,
  status media_status not null default 'staging',
  created_at timestamptz not null default now()
);

create table public.features (
  slug text primary key,
  label text not null
);

create table public.cafe_features (
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  feature_slug text not null references public.features(slug) on delete cascade,
  primary key (cafe_id, feature_slug)
);

create table public.tags (
  slug text primary key,
  name text not null
);

create table public.cafe_tags (
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  tag_slug text not null references public.tags(slug) on delete cascade,
  primary key (cafe_id, tag_slug)
);

create table public.cafe_social_links (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  platform text not null,
  url text not null default '',
  handle text,
  normalized_handle text,
  label text,
  constraint cafe_social_links_platform_check check (platform in ('website', 'instagram', 'tiktok', 'x', 'other')),
  unique (cafe_id, platform)
);

create table public.cafe_submissions (
  id uuid primary key default gen_random_uuid(),
  requester_clerk_user_id text not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  cafe_id uuid references public.cafes(id) on delete set null,
  submission_slug text not null,
  instagram_handle text not null,
  status submission_status not null default 'pending',
  payload jsonb not null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requester_clerk_user_id text not null,
  proof text not null,
  status claim_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_id uuid references public.cafe_locations(id) on delete set null,
  status cafe_event_status not null default 'draft',
  created_by_clerk_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_clerk_user_id text not null,
  action text not null,
  resource_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index cafes_status_slug_idx on public.cafes (status, slug);
create index cafes_published_slug_idx on public.cafes (slug) where status = 'published';
create index workspaces_clerk_org_id_idx on public.workspaces (clerk_org_id);
create index workspace_memberships_user_workspace_idx on public.workspace_memberships (clerk_user_id, workspace_id);
create index claim_requests_status_idx on public.claim_requests (status);
create index cafe_submissions_status_created_at_idx on public.cafe_submissions (status, created_at desc);
create unique index cafe_submissions_active_instagram_uidx on public.cafe_submissions (instagram_handle)
where status in ('pending', 'approved', 'converted');
create unique index cafe_social_links_instagram_handle_uidx on public.cafe_social_links (normalized_handle)
where platform = 'instagram' and normalized_handle is not null;
create index events_workspace_status_starts_at_idx on public.events (workspace_id, status, starts_at);
create index cafe_locations_cafe_sort_idx on public.cafe_locations (cafe_id, sort_order);
create index cafe_media_cafe_status_sort_idx on public.cafe_media (cafe_id, status, sort_order);

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.cafes enable row level security;
alter table public.cafe_locations enable row level security;
alter table public.cafe_media enable row level security;
alter table public.features enable row level security;
alter table public.cafe_features enable row level security;
alter table public.tags enable row level security;
alter table public.cafe_tags enable row level security;
alter table public.cafe_social_links enable row level security;
alter table public.cafe_submissions enable row level security;
alter table public.claim_requests enable row level security;
alter table public.events enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles can read own profile"
on public.profiles for select
to authenticated
using (clerk_user_id = public.current_clerk_user_id());

create policy "platform admins can read own admin row"
on public.platform_admins for select
to authenticated
using (clerk_user_id = public.current_clerk_user_id());

create policy "public can read published cafes"
on public.cafes for select
to anon, authenticated
using (status = 'published');

create policy "public can read locations for published cafes"
on public.cafe_locations for select
to anon, authenticated
using (
  exists (
    select 1 from public.cafes
    where cafes.id = cafe_locations.cafe_id
      and cafes.status = 'published'
  )
);

create policy "public can read approved media for published cafes"
on public.cafe_media for select
to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.cafes
    where cafes.id = cafe_media.cafe_id
      and cafes.status = 'published'
  )
);

create policy "public can read feature catalog"
on public.features for select
to anon, authenticated
using (true);

create policy "public can read cafe features for published cafes"
on public.cafe_features for select
to anon, authenticated
using (
  exists (
    select 1 from public.cafes
    where cafes.id = cafe_features.cafe_id
      and cafes.status = 'published'
  )
);

create policy "public can read tags"
on public.tags for select
to anon, authenticated
using (true);

create policy "public can read cafe tags for published cafes"
on public.cafe_tags for select
to anon, authenticated
using (
  exists (
    select 1 from public.cafes
    where cafes.id = cafe_tags.cafe_id
      and cafes.status = 'published'
  )
);

create policy "public can read social links for published cafes"
on public.cafe_social_links for select
to anon, authenticated
using (
  exists (
    select 1 from public.cafes
    where cafes.id = cafe_social_links.cafe_id
      and cafes.status = 'published'
  )
);

create policy "members can read own workspaces"
on public.workspaces for select
to authenticated
using (
  exists (
    select 1 from public.workspace_memberships
    where workspace_memberships.workspace_id = workspaces.id
      and workspace_memberships.clerk_user_id = public.current_clerk_user_id()
  )
);

create policy "public can read workspaces for published cafes"
on public.workspaces for select
to anon, authenticated
using (
  exists (
    select 1 from public.cafes
    where cafes.workspace_id = workspaces.id
      and cafes.status = 'published'
  )
);

create policy "members can read own memberships"
on public.workspace_memberships for select
to authenticated
using (clerk_user_id = public.current_clerk_user_id());

create policy "users can read own submissions"
on public.cafe_submissions for select
to authenticated
using (requester_clerk_user_id = public.current_clerk_user_id());

create policy "users can insert own submissions"
on public.cafe_submissions for insert
to authenticated
with check (requester_clerk_user_id = public.current_clerk_user_id());

create policy "users can read own claims"
on public.claim_requests for select
to authenticated
using (requester_clerk_user_id = public.current_clerk_user_id());

create policy "users can insert own claims"
on public.claim_requests for insert
to authenticated
with check (requester_clerk_user_id = public.current_clerk_user_id());

create policy "public can read published events"
on public.events for select
to anon, authenticated
using (status = 'published');

grant usage on schema public to anon, authenticated;
grant select on public.cafes, public.cafe_locations, public.cafe_media, public.features, public.cafe_features, public.tags, public.cafe_tags, public.cafe_social_links, public.events to anon, authenticated;
grant select, insert on public.cafe_submissions, public.claim_requests to authenticated;
grant select on public.profiles, public.platform_admins, public.workspaces, public.workspace_memberships to authenticated;

insert into storage.buckets (id, name, public)
values ('cafe-media', 'cafe-media', true), ('cafe-submissions', 'cafe-submissions', false)
on conflict (id) do nothing;
