alter table public.projects
  add column if not exists project_code text,
  add column if not exists survey_name text,
  add column if not exists workflow_status text not null default 'live'
    check (workflow_status in ('live', 'pending', 'paused', 'ids_awaited')),
  add column if not exists project_type text,
  add column if not exists survey_category text,
  add column if not exists project_manager text,
  add column if not exists secondary_project_manager text,
  add column if not exists create_date date,
  add column if not exists end_date date,
  add column if not exists pre_screening text
    check (pre_screening in ('on', 'off')),
  add column if not exists ai_pre_screening_status text
    check (ai_pre_screening_status in ('on', 'off')),
  add column if not exists number_of_questions integer,
  add column if not exists client_name text,
  add column if not exists sales_person text,
  add column if not exists client_po_number text,
  add column if not exists variable text,
  add column if not exists quota integer,
  add column if not exists country text,
  add column if not exists ir numeric(7, 2),
  add column if not exists loi integer,
  add column if not exists cpi numeric(10, 2),
  add column if not exists segment text,
  add column if not exists survey_link text,
  add column if not exists supplier_name text,
  add column if not exists supplier_cpi numeric(10, 2),
  add column if not exists rd_search boolean not null default false,
  add column if not exists rd_review boolean not null default false,
  add column if not exists rd_predupe boolean not null default false,
  add column if not exists rd_activity boolean not null default false,
  add column if not exists rd_email_verify boolean not null default false,
  add column if not exists speeder_term text not null default 'off'
    check (speeder_term in ('on', 'off')),
  add column if not exists geo_ip text not null default 'off'
    check (geo_ip in ('on', 'off')),
  add column if not exists duplicate_ip text not null default 'off'
    check (duplicate_ip in ('on', 'off')),
  add column if not exists pre_screening_captcha text not null default 'off'
    check (pre_screening_captcha in ('on', 'off')),
  add column if not exists survalidate text not null default 'off'
    check (survalidate in ('on', 'off')),
  add column if not exists dfiq_portal text not null default 'off'
    check (dfiq_portal in ('on', 'off')),
  add column if not exists campaign_banner text not null default 'hide'
    check (campaign_banner in ('hide', 'show')),
  add column if not exists campaign_banner_status text,
  add column if not exists updated_at timestamptz not null default now();

update public.projects
set
  survey_name = coalesce(survey_name, name),
  workflow_status = coalesce(workflow_status, 'live'),
  project_type = coalesce(project_type, 'consumer'),
  survey_category = coalesce(survey_category, 'general'),
  project_manager = coalesce(project_manager, 'AR'),
  create_date = coalesce(create_date, (created_at at time zone 'utc')::date),
  pre_screening = coalesce(pre_screening, 'off'),
  ai_pre_screening_status = coalesce(ai_pre_screening_status, 'off'),
  sales_person = coalesce(sales_person, 'AR'),
  campaign_banner_status = coalesce(campaign_banner_status, 'Complete, Terminate, Quota-Full'),
  updated_at = coalesce(updated_at, created_at);

create unique index if not exists idx_projects_project_code_unique
  on public.projects(project_code)
  where project_code is not null;

create index if not exists idx_projects_workflow_status on public.projects(workflow_status);
create index if not exists idx_projects_project_manager on public.projects(project_manager);
create index if not exists idx_projects_sales_person on public.projects(sales_person);
