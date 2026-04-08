-- Daily Field Labor Report forms schema
create table if not exists public.forms_daily_field_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  project_id uuid null,
  report_date date not null,
  job_number text null,
  project_name_snapshot text null,
  customer_gc_snapshot text null,
  lead_foreman_name text null,
  scope_of_work text null,
  daily_notes text null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'pm_reviewed', 'client_signed', 'sent_to_accounting')),
  pm_review_required boolean not null default true,
  pm_reviewed_at timestamptz null,
  pm_reviewed_by uuid null,
  client_not_available boolean not null default false,
  guardian_signature_url text null,
  guardian_signed_at timestamptz null,
  customer_signature_url text null,
  customer_signed_at timestamptz null,
  submitted_at timestamptz null,
  submitted_by uuid null,
  sent_to_accounting_at timestamptz null,
  accounting_recipient_email text null,
  client_recipient_email text null,
  pm_recipient_email text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_forms_daily_field_reports_status on public.forms_daily_field_reports(status);
create index if not exists idx_forms_daily_field_reports_report_date on public.forms_daily_field_reports(report_date desc);

create trigger trg_forms_daily_field_reports_updated_at
before update on public.forms_daily_field_reports
for each row execute function public.set_updated_at();

create table if not exists public.forms_daily_field_report_labor (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.forms_daily_field_reports(id) on delete cascade,
  worker_name text null,
  role_class text null,
  st_hours numeric(8,2) not null default 0,
  ot_hours numeric(8,2) not null default 0,
  notes text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_forms_daily_field_report_labor_report_id on public.forms_daily_field_report_labor(report_id);

create table if not exists public.forms_daily_field_report_materials (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.forms_daily_field_reports(id) on delete cascade,
  qty numeric(10,2) null,
  unit text null,
  description text null,
  notes text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_forms_daily_field_report_materials_report_id on public.forms_daily_field_report_materials(report_id);

create table if not exists public.forms_daily_field_report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.forms_daily_field_reports(id) on delete cascade,
  storage_path text not null,
  caption text null,
  uploaded_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_forms_daily_field_report_photos_report_id on public.forms_daily_field_report_photos(report_id);

insert into storage.buckets (id, name, public)
values ('form-photos', 'form-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('form-signatures', 'form-signatures', true)
on conflict (id) do nothing;
