alter table public.cafe_submissions
add column if not exists submission_slug text;

alter table public.cafe_submissions
add column if not exists instagram_handle text;

alter table public.cafe_social_links
add column if not exists normalized_handle text;

update public.cafe_submissions
set submission_slug = regexp_replace(
  regexp_replace(
    lower(
      translate(
        coalesce(payload ->> 'name', id::text),
        'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC'
      )
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-|-$)',
  '',
  'g'
)
where submission_slug is null;

alter table public.cafe_submissions
alter column submission_slug set not null;

update public.cafe_submissions
set instagram_handle = lower(
  regexp_replace(
    regexp_replace(coalesce(payload ->> 'instagram', ''), '^https?://(www\\.)?instagram\\.com/', '', 'i'),
    '^@|/.*$',
    '',
    'g'
  )
)
where instagram_handle is null;

alter table public.cafe_submissions
alter column instagram_handle set not null;

update public.cafe_social_links
set normalized_handle = lower(
  regexp_replace(
    regexp_replace(coalesce(handle, url), '^https?://(www\\.)?instagram\\.com/', '', 'i'),
    '^@|/.*$',
    '',
    'g'
  )
)
where platform = 'instagram'
  and normalized_handle is null;

drop index if exists public.cafe_submissions_active_slug_uidx;
drop index if exists public.cafe_submissions_active_instagram_uidx;
drop index if exists public.cafe_social_links_instagram_handle_uidx;

create unique index cafe_submissions_active_instagram_uidx
on public.cafe_submissions (instagram_handle)
where status in ('pending', 'approved', 'converted');

create unique index cafe_social_links_instagram_handle_uidx
on public.cafe_social_links (normalized_handle)
where platform = 'instagram' and normalized_handle is not null;
