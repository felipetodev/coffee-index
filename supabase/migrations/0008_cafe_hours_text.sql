alter table public.cafes
add column if not exists hours_text text;

update public.cafes cafe
set hours_text = hour_notes.notes
from (
  select
    cafe_id,
    string_agg(btrim(notes), E'\n' order by weekday) as notes
  from public.cafe_hours
  where notes is not null
    and btrim(notes) <> ''
  group by cafe_id
) hour_notes
where cafe.id = hour_notes.cafe_id
  and (cafe.hours_text is null or btrim(cafe.hours_text) = '');
