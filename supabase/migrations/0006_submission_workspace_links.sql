alter table public.cafe_submissions
add column if not exists workspace_id uuid;

alter table public.cafe_submissions
add column if not exists cafe_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_submissions_workspace_id_fkey'
      and conrelid = 'public.cafe_submissions'::regclass
  ) then
    alter table public.cafe_submissions
    add constraint cafe_submissions_workspace_id_fkey
    foreign key (workspace_id)
    references public.workspaces(id)
    on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_submissions_cafe_id_fkey'
      and conrelid = 'public.cafe_submissions'::regclass
  ) then
    alter table public.cafe_submissions
    add constraint cafe_submissions_cafe_id_fkey
    foreign key (cafe_id)
    references public.cafes(id)
    on delete set null;
  end if;
end $$;
