# Forms Implementation Plan

## Component / File Structure
- `app/forms/page.tsx`: Forms hub.
- `app/forms/daily-field-labor/page.tsx`: report list with status filters.
- `app/forms/daily-field-labor/new/page.tsx`: create report.
- `app/forms/daily-field-labor/[id]/page.tsx`: edit/view report.
- `components/forms/DailyFieldLaborForm.tsx`: step/section-based form UI with autosave.
- `components/forms/StatusBadge.tsx`: report status badge.
- `app/api/forms/daily-field-labor/route.ts`: list + create/save draft.
- `app/api/forms/daily-field-labor/[id]/route.ts`: load + update/submit.
- `app/api/forms/upload/route.ts`: Supabase Storage uploads for photos/signatures.
- `lib/forms/types.ts`: form and row types.
- `lib/forms/repository.ts`: Supabase data access for forms.
- `supabase/forms_daily_field_reports.sql`: DB schema + bucket setup.

## Database Plan
- `forms_daily_field_reports` for parent report record and workflow status.
- `forms_daily_field_report_labor` for labor line items.
- `forms_daily_field_report_materials` for material line items.
- `forms_daily_field_report_photos` for photo attachments.
- Storage buckets:
  - `form-photos`
  - `form-signatures`
- Updated-at trigger on parent table using existing `public.set_updated_at()`.
