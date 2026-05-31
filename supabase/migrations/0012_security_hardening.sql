create or replace function public.current_clerk_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

revoke all on public.profiles from anon, authenticated;
revoke all on public.platform_admins from anon, authenticated;
revoke all on public.workspaces from anon, authenticated;
revoke all on public.workspace_memberships from anon, authenticated;
revoke all on public.cafes from anon, authenticated;
revoke all on public.cafe_locations from anon, authenticated;
revoke all on public.cafe_media from anon, authenticated;
revoke all on public.features from anon, authenticated;
revoke all on public.cafe_features from anon, authenticated;
revoke all on public.tags from anon, authenticated;
revoke all on public.cafe_tags from anon, authenticated;
revoke all on public.cafe_social_links from anon, authenticated;
revoke all on public.cafe_submissions from anon, authenticated;
revoke all on public.claim_requests from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.cafe_reviews from anon, authenticated;
revoke all on public.cafe_review_media from anon, authenticated;
revoke all on public.cafe_favorites from anon, authenticated;
revoke all on public.event_media from anon, authenticated;
revoke all on public.event_tags from anon, authenticated;
revoke all on public.event_comments from anon, authenticated;
revoke all on public.event_notifications from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.cafes to anon, authenticated;
grant select on public.cafe_locations to anon, authenticated;
grant select on public.cafe_media to anon, authenticated;
grant select on public.features to anon, authenticated;
grant select on public.cafe_features to anon, authenticated;
grant select on public.tags to anon, authenticated;
grant select on public.cafe_tags to anon, authenticated;
grant select on public.cafe_social_links to anon, authenticated;
grant select on public.workspaces to anon, authenticated;
grant select on public.events to anon, authenticated;
grant select on public.event_media to anon, authenticated;
grant select on public.event_tags to anon, authenticated;
grant select on public.event_comments to anon, authenticated;
grant select on public.cafe_reviews to anon, authenticated;
grant select on public.cafe_review_media to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.platform_admins to authenticated;
grant select on public.workspace_memberships to authenticated;
grant select, insert on public.cafe_submissions to authenticated;
grant select, insert on public.claim_requests to authenticated;
grant insert on public.event_comments to authenticated;
grant select, update, delete on public.event_notifications to authenticated;
grant insert, update on public.cafe_reviews to authenticated;
grant select, insert, delete on public.cafe_favorites to authenticated;
