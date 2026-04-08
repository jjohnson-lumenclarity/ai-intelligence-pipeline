export type ReportStatus = "draft" | "submitted" | "pm_reviewed" | "client_signed" | "sent_to_accounting";

export type LaborRow = {
  id?: string;
  worker_name: string;
  role_class: string;
  st_hours: number;
  ot_hours: number;
  notes: string;
  sort_order: number;
};

export type MaterialRow = {
  id?: string;
  qty: number | null;
  unit: string;
  description: string;
  notes: string;
  sort_order: number;
};

export type PhotoRow = {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export type DailyFieldReportPayload = {
  id?: string;
  organization_id?: string | null;
  project_id?: string | null;
  report_date: string;
  job_number?: string | null;
  project_name_snapshot?: string | null;
  customer_gc_snapshot?: string | null;
  lead_foreman_name?: string | null;
  scope_of_work?: string | null;
  daily_notes?: string | null;
  status?: ReportStatus;
  client_not_available?: boolean;
  guardian_signature_url?: string | null;
  guardian_signed_at?: string | null;
  customer_signature_url?: string | null;
  customer_signed_at?: string | null;
  submitted_by?: string | null;
  labor: LaborRow[];
  materials: MaterialRow[];
};

export type DailyFieldReport = DailyFieldReportPayload & {
  id: string;
  created_at: string;
  updated_at: string;
  photos: PhotoRow[];
};
