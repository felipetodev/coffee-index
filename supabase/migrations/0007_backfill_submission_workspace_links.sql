update public.cafe_submissions submission
set
  workspace_id = cafe.workspace_id,
  cafe_id = cafe.id
from public.cafe_social_links social
join public.cafes cafe on cafe.id = social.cafe_id
where submission.status = 'converted'
  and submission.workspace_id is null
  and submission.cafe_id is null
  and social.platform = 'instagram'
  and social.normalized_handle is not null
  and social.normalized_handle = submission.instagram_handle;
