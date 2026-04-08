import { supabase } from "@/lib/db";
import type { DailyFieldReport, DailyFieldReportPayload, MaterialRow, LaborRow, ReportStatus } from "@/lib/forms/types";

const REPORT_SELECT =
  "id, organization_id, project_id, report_date, job_number, project_name_snapshot, customer_gc_snapshot, lead_foreman_name, scope_of_work, daily_notes, status, pm_review_required, pm_reviewed_at, pm_reviewed_by, client_not_available, guardian_signature_url, guardian_signed_at, customer_signature_url, customer_signed_at, submitted_at, submitted_by, sent_to_accounting_at, accounting_recipient_email, client_recipient_email, pm_recipient_email, created_at, updated_at";

export async function listDailyFieldReports(status?: ReportStatus) {
  let query = supabase.from("forms_daily_field_reports").select(REPORT_SELECT).order("report_date", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getDailyFieldReport(id: string): Promise<DailyFieldReport | null> {
  const { data: report, error } = await supabase.from("forms_daily_field_reports").select(REPORT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!report) return null;

  const [{ data: labor }, { data: materials }, { data: photos }] = await Promise.all([
    supabase.from("forms_daily_field_report_labor").select("*").eq("report_id", id).order("sort_order", { ascending: true }),
    supabase.from("forms_daily_field_report_materials").select("*").eq("report_id", id).order("sort_order", { ascending: true }),
    supabase.from("forms_daily_field_report_photos").select("id, storage_path, caption, created_at").eq("report_id", id).order("created_at", { ascending: true }),
  ]);

  return {
    ...report,
    labor: (labor ?? []) as LaborRow[],
    materials: (materials ?? []) as MaterialRow[],
    photos: photos ?? [],
  } as DailyFieldReport;
}

export async function upsertDailyFieldReport(payload: DailyFieldReportPayload) {
  const base = {
    organization_id: payload.organization_id ?? null,
    project_id: payload.project_id ?? null,
    report_date: payload.report_date,
    job_number: payload.job_number ?? null,
    project_name_snapshot: payload.project_name_snapshot ?? null,
    customer_gc_snapshot: payload.customer_gc_snapshot ?? null,
    lead_foreman_name: payload.lead_foreman_name ?? null,
    scope_of_work: payload.scope_of_work ?? null,
    daily_notes: payload.daily_notes ?? null,
    status: payload.status ?? "draft",
    client_not_available: payload.client_not_available ?? false,
    guardian_signature_url: payload.guardian_signature_url ?? null,
    guardian_signed_at: payload.guardian_signed_at ?? null,
    customer_signature_url: payload.customer_signature_url ?? null,
    customer_signed_at: payload.customer_signed_at ?? null,
    submitted_at: payload.status === "submitted" ? new Date().toISOString() : null,
    submitted_by: payload.status === "submitted" ? payload.submitted_by ?? null : null,
  };

  let reportId = payload.id;

  if (!reportId) {
    const { data, error } = await supabase.from("forms_daily_field_reports").insert(base).select("id").single();
    if (error) throw error;
    reportId = data.id;
  } else {
    const { error } = await supabase.from("forms_daily_field_reports").update(base).eq("id", reportId);
    if (error) throw error;

    await Promise.all([
      supabase.from("forms_daily_field_report_labor").delete().eq("report_id", reportId),
      supabase.from("forms_daily_field_report_materials").delete().eq("report_id", reportId),
    ]);
  }

  if (!reportId) throw new Error("Report ID missing after save");

  if (payload.labor.length > 0) {
    const laborRows = payload.labor.map((row, i) => ({
      report_id: reportId,
      worker_name: row.worker_name || null,
      role_class: row.role_class || null,
      st_hours: row.st_hours || 0,
      ot_hours: row.ot_hours || 0,
      notes: row.notes || null,
      sort_order: i,
    }));

    const { error } = await supabase.from("forms_daily_field_report_labor").insert(laborRows);
    if (error) throw error;
  }

  if (payload.materials.length > 0) {
    const materialRows = payload.materials.map((row, i) => ({
      report_id: reportId,
      qty: row.qty,
      unit: row.unit || null,
      description: row.description || null,
      notes: row.notes || null,
      sort_order: i,
    }));

    const { error } = await supabase.from("forms_daily_field_report_materials").insert(materialRows);
    if (error) throw error;
  }

  return reportId;
}
