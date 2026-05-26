create unique index if not exists workspace_memberships_workspace_user_uidx
on public.workspace_memberships (workspace_id, clerk_user_id);
