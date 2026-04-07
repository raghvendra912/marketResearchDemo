-- Enable extension for UUID generation.
create extension if not exists pgcrypto;

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  text text not null,
  type text not null check (type in ('text', 'textarea', 'multiple-choice', 'number')),
  is_required boolean not null default true,
  options jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_survey_id on public.questions (survey_id);
create index if not exists idx_responses_survey_id on public.responses (survey_id);
create index if not exists idx_answers_response_id on public.answers (response_id);
create index if not exists idx_answers_question_id on public.answers (question_id);

alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;

-- Public read for published surveys and their questions.
drop policy if exists "Public can read published surveys" on public.surveys;
create policy "Public can read published surveys"
  on public.surveys
  for select
  using (is_published = true);

drop policy if exists "Public can read published survey questions" on public.questions;
create policy "Public can read published survey questions"
  on public.questions
  for select
  using (
    exists (
      select 1
      from public.surveys s
      where s.id = questions.survey_id and s.is_published = true
    )
  );

-- Lock direct access by default. API route should insert via service role key.
drop policy if exists "No direct response inserts" on public.responses;
create policy "No direct response inserts"
  on public.responses
  for insert
  to anon
  with check (false);

drop policy if exists "No direct answer inserts" on public.answers;
create policy "No direct answer inserts"
  on public.answers
  for insert
  to anon
  with check (false);