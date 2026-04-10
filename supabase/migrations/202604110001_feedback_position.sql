alter table public.feedback_items
  add column if not exists feature_position text;

create index if not exists idx_feedback_items_feature_position
  on public.feedback_items(feature_position);
