create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  role text not null check (role in ('admin', 'pm', 'sales')),
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  feature_title text not null,
  current_behavior text not null,
  expected_behavior text not null,
  impact text not null default '',
  status text not null default 'open' check (status in ('open', 'planned', 'in_progress', 'done')),
  created_by_name text not null,
  created_by_email text not null,
  created_by_role text not null check (created_by_role in ('admin', 'pm', 'sales')),
  developer_note text,
  updated_by_name text,
  agent_requested boolean not null default false,
  agent_request_note text,
  agent_approved boolean not null default false,
  agent_approval_comment text,
  agent_approved_by_name text,
  agent_run_status text not null default 'idle' check (agent_run_status in ('idle', 'queued', 'running', 'done', 'failed')),
  agent_run_log text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_email on public.app_users (email);
create index if not exists idx_feedback_items_created_at on public.feedback_items (created_at desc);
create index if not exists idx_feedback_items_status on public.feedback_items (status);
create index if not exists idx_feedback_items_agent_run_status on public.feedback_items (agent_run_status);

alter table public.app_users enable row level security;
alter table public.feedback_items enable row level security;

drop policy if exists "No direct app user inserts" on public.app_users;
create policy "No direct app user inserts"
  on public.app_users
  for insert
  to anon
  with check (false);

drop policy if exists "No direct app user reads" on public.app_users;
create policy "No direct app user reads"
  on public.app_users
  for select
  to anon
  using (false);

drop policy if exists "No direct feedback reads" on public.feedback_items;
create policy "No direct feedback reads"
  on public.feedback_items
  for select
  to anon
  using (false);

drop policy if exists "No direct feedback inserts" on public.feedback_items;
create policy "No direct feedback inserts"
  on public.feedback_items
  for insert
  to anon
  with check (false);
