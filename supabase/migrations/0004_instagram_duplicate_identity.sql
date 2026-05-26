drop index if exists public.cafe_submissions_active_slug_uidx;

create unique index if not exists cafe_submissions_active_instagram_uidx
on public.cafe_submissions (instagram_handle)
where status in ('pending', 'approved', 'converted');
