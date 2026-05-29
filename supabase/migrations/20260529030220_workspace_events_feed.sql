-- This migration corresponds to 0011_workspace_events_feed.sql in the sequential naming convention.

alter table public.events
add column if not exists slug text,
add column if not exists subtitle text,
add column if not exists external_url text,
add column if not exists address text,
add column if not exists published_at timestamptz,
add column if not exists cancelled_at timestamptz,
add constraint events_dates_check check (ends_at is null or ends_at > starts_at),
add constraint events_slug_check check (slug is null or char_length(btrim(slug)) > 0);

update public.events
set slug = concat('evento-', id::text)
where slug is null;

alter table public.events
alter column slug set not null;

create unique index if not exists events_slug_uidx on public.events (slug);
create index if not exists events_status_starts_at_idx on public.events (status, starts_at desc);
create index if not exists events_published_feed_idx on public.events (starts_at desc)
where status = 'published';

drop policy if exists "public can read published events" on public.events;

create policy "public can read published events"
on public.events for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.cafes
    where cafes.workspace_id = events.workspace_id
      and cafes.status = 'published'
  )
);

create table public.event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_bucket text not null default 'event-media',
  storage_path text not null,
  alt text,
  sort_order integer not null default 0 check (sort_order between 0 and 2),
  created_at timestamptz not null default now(),
  unique (event_id, sort_order)
);

create table public.event_tags (
  event_id uuid not null references public.events(id) on delete cascade,
  tag_slug text not null references public.tags(slug) on delete cascade,
  primary key (event_id, tag_slug)
);

create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  parent_id uuid references public.event_comments(id) on delete cascade,
  author_clerk_user_id text not null,
  body text not null check (char_length(btrim(body)) between 1 and 1200),
  is_workspace_reply boolean not null default false,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_comments_no_self_parent check (parent_id is null or parent_id <> id)
);

create table public.event_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_clerk_user_id text not null,
  event_id uuid not null references public.events(id) on delete cascade,
  read_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (recipient_clerk_user_id, event_id)
);

create index event_media_event_sort_idx
on public.event_media (event_id, sort_order);

create index event_tags_tag_event_idx
on public.event_tags (tag_slug, event_id);

create index event_comments_event_created_at_idx
on public.event_comments (event_id, created_at);

create index event_comments_parent_idx
on public.event_comments (parent_id)
where parent_id is not null;

create index event_notifications_recipient_active_idx
on public.event_notifications (recipient_clerk_user_id, expires_at desc, read_at)
where read_at is null;

alter table public.event_media enable row level security;
alter table public.event_tags enable row level security;
alter table public.event_comments enable row level security;
alter table public.event_notifications enable row level security;

create policy "public can read media for published events"
on public.event_media for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    join public.workspaces on workspaces.id = events.workspace_id
    join public.cafes on cafes.workspace_id = workspaces.id
    where events.id = event_media.event_id
      and events.status = 'published'
      and cafes.status = 'published'
  )
);

create policy "public can read tags for published events"
on public.event_tags for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    join public.workspaces on workspaces.id = events.workspace_id
    join public.cafes on cafes.workspace_id = workspaces.id
    where events.id = event_tags.event_id
      and events.status = 'published'
      and cafes.status = 'published'
  )
);

create policy "public can read visible comments for published events"
on public.event_comments for select
to anon, authenticated
using (
  hidden_at is null
  and exists (
    select 1
    from public.events
    join public.workspaces on workspaces.id = events.workspace_id
    join public.cafes on cafes.workspace_id = workspaces.id
    where events.id = event_comments.event_id
      and events.status = 'published'
      and cafes.status = 'published'
  )
);

create policy "users can insert own event comments"
on public.event_comments for insert
to authenticated
with check (
  author_clerk_user_id = public.current_clerk_user_id()
  and is_workspace_reply = false
  and hidden_at is null
  and exists (
    select 1 from public.events
    where events.id = event_comments.event_id
      and events.status = 'published'
  )
);

create policy "users can read own event notifications"
on public.event_notifications for select
to authenticated
using (recipient_clerk_user_id = public.current_clerk_user_id());

create policy "users can update own event notifications"
on public.event_notifications for update
to authenticated
using (recipient_clerk_user_id = public.current_clerk_user_id())
with check (recipient_clerk_user_id = public.current_clerk_user_id());

create policy "users can delete own event notifications"
on public.event_notifications for delete
to authenticated
using (recipient_clerk_user_id = public.current_clerk_user_id());

grant select on public.event_media, public.event_tags, public.event_comments to anon, authenticated;
grant insert on public.event_comments to authenticated;
grant select, update, delete on public.event_notifications to authenticated;

insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;
