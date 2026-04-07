create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  survey_id uuid not null references public.surveys(id) on delete cascade,
  platform text not null check (platform in ('cint', 'prime_sample', 'other')),
  source_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.link_visits (
  id uuid primary key default gen_random_uuid(),
  project_link_id uuid not null references public.project_links(id) on delete cascade,
  ip_address text,
  user_agent text,
  referer text,
  created_at timestamptz not null default now()
);

alter table public.responses
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists idx_projects_survey_id on public.projects(survey_id);
create index if not exists idx_project_links_project_id on public.project_links(project_id);
create index if not exists idx_project_links_slug on public.project_links(slug);
create index if not exists idx_responses_project_id on public.responses(project_id);
create index if not exists idx_link_visits_project_link_id on public.link_visits(project_link_id);

alter table public.projects enable row level security;
alter table public.project_links enable row level security;
alter table public.link_visits enable row level security;

drop policy if exists "No direct project inserts" on public.projects;
create policy "No direct project inserts"
  on public.projects
  for insert
  to anon
  with check (false);

drop policy if exists "No direct project link inserts" on public.project_links;
create policy "No direct project link inserts"
  on public.project_links
  for insert
  to anon
  with check (false);

drop policy if exists "No direct link visit inserts" on public.link_visits;
create policy "No direct link visit inserts"
  on public.link_visits
  for insert
  to anon
  with check (false);
