-- Supabase schema for AI Intelligence Pipeline
-- Requires pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Keep updated_at fresh on updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('rss', 'youtube', 'manual')),
  name text not null,
  url text,
  external_id text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_sources_identity_unique
on public.sources (source_type, coalesce(url, ''), coalesce(external_id, ''));

create trigger trg_sources_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  source_item_id text not null,
  title text,
  url text,
  content_text text,
  raw_payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_source_ingest_uk unique (source_id, source_item_id)
);

create index if not exists idx_content_items_source_id on public.content_items(source_id);
create index if not exists idx_content_items_published_at on public.content_items(published_at desc);

create trigger trg_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create table if not exists public.item_summaries (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  model text not null,
  prompt_version text,
  summary_text text not null,
  tokens_used integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_item_summaries_content_item_id on public.item_summaries(content_item_id);

create trigger trg_item_summaries_updated_at
before update on public.item_summaries
for each row execute function public.set_updated_at();

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_report_runs_started_at on public.report_runs(started_at desc);

create trigger trg_report_runs_updated_at
before update on public.report_runs
for each row execute function public.set_updated_at();

create table if not exists public.report_run_items (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null references public.report_runs(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  item_summary_id uuid references public.item_summaries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_run_items_unique_item_per_run unique (report_run_id, content_item_id)
);

create index if not exists idx_report_run_items_run_id on public.report_run_items(report_run_id);
create index if not exists idx_report_run_items_content_item_id on public.report_run_items(content_item_id);

create trigger trg_report_run_items_updated_at
before update on public.report_run_items
for each row execute function public.set_updated_at();

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null unique references public.report_runs(id) on delete cascade,
  title text,
  content text not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();
