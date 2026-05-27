create type review_status as enum ('pending', 'approved', 'rejected');

create table public.cafe_reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  author_clerk_user_id text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) >= 85),
  status review_status not null default 'pending',
  reviewed_at timestamptz,
  last_submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cafe_id, author_clerk_user_id)
);

create table public.cafe_review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.cafe_reviews(id) on delete cascade,
  storage_bucket text not null default 'review-media',
  storage_path text not null,
  alt text,
  sort_order integer not null default 0 check (sort_order between 0 and 2),
  created_at timestamptz not null default now(),
  unique (review_id, sort_order)
);

create table public.cafe_favorites (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  clerk_user_id text not null,
  created_at timestamptz not null default now(),
  unique (cafe_id, clerk_user_id)
);

create index cafe_reviews_cafe_status_created_at_idx
on public.cafe_reviews (cafe_id, status, created_at desc);

create index cafe_reviews_status_created_at_idx
on public.cafe_reviews (status, created_at desc);

create index cafe_reviews_author_cafe_submitted_idx
on public.cafe_reviews (author_clerk_user_id, cafe_id, last_submitted_at desc);

create index cafe_review_media_review_sort_idx
on public.cafe_review_media (review_id, sort_order);

create index cafe_favorites_user_created_at_idx
on public.cafe_favorites (clerk_user_id, created_at desc);

alter table public.cafe_reviews enable row level security;
alter table public.cafe_review_media enable row level security;
alter table public.cafe_favorites enable row level security;

create policy "public can read approved reviews for published cafes"
on public.cafe_reviews for select
to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.cafes
    where cafes.id = cafe_reviews.cafe_id
      and cafes.status = 'published'
  )
);

create policy "users can read own reviews"
on public.cafe_reviews for select
to authenticated
using (author_clerk_user_id = public.current_clerk_user_id());

create policy "users can insert own reviews"
on public.cafe_reviews for insert
to authenticated
with check (author_clerk_user_id = public.current_clerk_user_id());

create policy "users can update own reviews"
on public.cafe_reviews for update
to authenticated
using (author_clerk_user_id = public.current_clerk_user_id())
with check (author_clerk_user_id = public.current_clerk_user_id());

create policy "public can read approved review media"
on public.cafe_review_media for select
to anon, authenticated
using (
  exists (
    select 1
    from public.cafe_reviews
    join public.cafes on cafes.id = cafe_reviews.cafe_id
    where cafe_reviews.id = cafe_review_media.review_id
      and cafe_reviews.status = 'approved'
      and cafes.status = 'published'
  )
);

create policy "users can read own review media"
on public.cafe_review_media for select
to authenticated
using (
  exists (
    select 1 from public.cafe_reviews
    where cafe_reviews.id = cafe_review_media.review_id
      and cafe_reviews.author_clerk_user_id = public.current_clerk_user_id()
  )
);

create policy "users can read own favorites"
on public.cafe_favorites for select
to authenticated
using (clerk_user_id = public.current_clerk_user_id());

create policy "users can insert own favorites"
on public.cafe_favorites for insert
to authenticated
with check (clerk_user_id = public.current_clerk_user_id());

create policy "users can delete own favorites"
on public.cafe_favorites for delete
to authenticated
using (clerk_user_id = public.current_clerk_user_id());

grant select on public.cafe_reviews, public.cafe_review_media to anon, authenticated;
grant select, insert, update on public.cafe_reviews to authenticated;
grant select, insert, delete on public.cafe_favorites to authenticated;

insert into storage.buckets (id, name, public)
values ('review-media', 'review-media', true)
on conflict (id) do nothing;
