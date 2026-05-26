alter table public.cafe_social_links
add column if not exists label text;

alter table public.cafe_social_links
drop constraint if exists cafe_social_links_platform_check;

alter table public.cafe_social_links
add constraint cafe_social_links_platform_check
check (platform in ('website', 'instagram', 'tiktok', 'x', 'other'));
