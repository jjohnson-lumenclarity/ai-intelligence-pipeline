"use client";

import { useEffect, useMemo, useState } from "react";
import type { DailyFieldReport, DailyFieldReportPayload, LaborRow, MaterialRow, ReportStatus } from "@/lib/forms/types";

type ProjectOption = { id: string; name: string; job_number?: string | null; customer_gc?: string | null };

type Props = {
  initialReport?: DailyFieldReport | null;
  projects: ProjectOption[];
};

const defaultLabor = (): LaborRow => ({ worker_name: "", role_class: "", st_hours: 0, ot_hours: 0, notes: "", sort_order: 0 });
const defaultMaterial = (): MaterialRow => ({ qty: null, unit: "", description: "", notes: "", sort_order: 0 });

export default function DailyFieldLaborForm({ initialReport, projects }: Props) {
  const [reportId, setReportId] = useState(initialReport?.id ?? "");
  const [statusText, setStatusText] = useState("");
  const [form, setForm] = useState<DailyFieldReportPayload>({
    id: initialReport?.id,
    project_id: initialReport?.project_id ?? null,
    report_date: initialReport?.report_date ?? new Date().toISOString().slice(0, 10),
    job_number: initialReport?.job_number ?? "",
    project_name_snapshot: initialReport?.project_name_snapshot ?? "",
    customer_gc_snapshot: initialReport?.customer_gc_snapshot ?? "",
    lead_foreman_name: initialReport?.lead_foreman_name ?? "",
    scope_of_work: initialReport?.scope_of_work ?? "",
    daily_notes: initialReport?.daily_notes ?? "",
    client_not_available: initialReport?.client_not_available ?? false,
    guardian_signature_url: initialReport?.guardian_signature_url ?? "",
    guardian_signed_at: initialReport?.guardian_signed_at ?? "",
    customer_signature_url: initialReport?.customer_signature_url ?? "",
    customer_signed_at: initialReport?.customer_signed_at ?? "",
    status: (initialReport?.status as ReportStatus) ?? "draft",
    labor: initialReport?.labor?.length ? initialReport.labor : [defaultLabor()],
    materials: initialReport?.materials?.length ? initialReport.materials : [defaultMaterial()],
  });
  const [photos, setPhotos] = useState(initialReport?.photos ?? []);

  const totals = useMemo(() => {
    const st = form.labor.reduce((sum, row) => sum + (Number(row.st_hours) || 0), 0);
    const ot = form.labor.reduce((sum, row) => sum + (Number(row.ot_hours) || 0), 0);
    return { st, ot, total: st + ot };
  }, [form.labor]);

  const completion = useMemo(() => {
    const checks = [
      !!form.report_date,
      !!form.project_name_snapshot,
      !!form.scope_of_work,
      form.labor.some((row) => row.worker_name || row.st_hours || row.ot_hours),
      form.materials.some((row) => row.description),
      !!form.daily_notes,
      !!form.guardian_signature_url,
      form.client_not_available || !!form.customer_signature_url,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form]);

  useEffect(() => {
    if (!reportId) return;
    const timer = setTimeout(() => {
      void saveDraft(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [form]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    setForm((prev) => ({
      ...prev,
      project_id: projectId || null,
      project_name_snapshot: project?.name ?? prev.project_name_snapshot,
      job_number: project?.job_number ?? prev.job_number,
      customer_gc_snapshot: project?.customer_gc ?? prev.customer_gc_snapshot,
    }));
  };

  const updateLabor = (index: number, patch: Partial<LaborRow>) => {
    setForm((prev) => ({
      ...prev,
      labor: prev.labor.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const updateMaterial = (index: number, patch: Partial<MaterialRow>) => {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const uploadDataUrl = async (file: File, kind: "photo" | "signature", caption?: string) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch("/api/forms/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: reportId || form.id, kind, dataUrl, caption }),
    });

    if (!response.ok) throw new Error("Upload failed");
    return response.json() as Promise<{ storage_path: string; public_url: string }>;
  };

  const saveDraft = async (silent = false) => {
    if (!form.report_date) {
      setStatusText("Report date is required.");
      return;
    }

    const endpoint = reportId ? `/api/forms/daily-field-labor/${reportId}` : "/api/forms/daily-field-labor";
    const method = reportId ? "PUT" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: reportId || undefined, status: "draft" }),
    });

    const json = (await response.json()) as { id?: string; error?: string };
    if (!response.ok) {
      setStatusText(`Save failed: ${json.error ?? "Unknown error"}`);
      return;
    }

    if (json.id) {
      setReportId(json.id);
      setForm((prev) => ({ ...prev, id: json.id }));
    }
    if (!silent) setStatusText("Draft saved.");
  };

  const submit = async () => {
    if (!form.scope_of_work || !form.project_name_snapshot || !form.lead_foreman_name) {
      setStatusText("Please complete Project Info and Scope before submitting.");
      return;
    }

    if (!form.guardian_signature_url) {
      setStatusText("Guardian signature is required before submit.");
      return;
    }

    if (!form.client_not_available && !form.customer_signature_url) {
      setStatusText("Customer signature required unless Client Not Available is checked.");
      return;
    }

    const endpoint = reportId ? `/api/forms/daily-field-labor/${reportId}` : "/api/forms/daily-field-labor";
    const method = reportId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: reportId || undefined, status: "submitted" }),
    });

    const json = (await response.json()) as { id?: string; error?: string };
    if (!response.ok) {
      setStatusText(`Submit failed: ${json.error ?? "Unknown error"}`);
      return;
    }

    setReportId(json.id ?? reportId);
    setStatusText("Submitted successfully.");
  };

  return (
    <main>
      <div style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #ddd", padding: "0.75rem 0", zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <strong>Daily Field Labor Report</strong>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            <span>Completion: {completion}%</span>
            <button onClick={() => void saveDraft()}>Save Draft</button>
            <button onClick={() => void submit()}>Submit</button>
          </div>
        </div>
        <p style={{ margin: "0.25rem 0 0" }}>{statusText}</p>
      </div>

      <section style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Project Info</h2>
          <label>Project</label>
          <select value={form.project_id ?? ""} onChange={(e) => handleProjectChange(e.target.value)}>
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <label>Project Name</label>
          <input value={form.project_name_snapshot ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, project_name_snapshot: e.target.value }))} />
          <label>Job Number</label>
          <input value={form.job_number ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, job_number: e.target.value }))} />
          <label>Lead / Foreman</label>
          <input value={form.lead_foreman_name ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, lead_foreman_name: e.target.value }))} />
          <label>Date</label>
          <input type="date" value={form.report_date} onChange={(e) => setForm((prev) => ({ ...prev, report_date: e.target.value }))} />
          <label>Customer / GC</label>
          <input value={form.customer_gc_snapshot ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, customer_gc_snapshot: e.target.value }))} />
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Work Performed / Scope</h2>
          <textarea rows={4} value={form.scope_of_work ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, scope_of_work: e.target.value }))} />
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Labor</h2>
          {form.labor.map((row, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 2fr auto", gap: ".5rem", marginBottom: ".5rem" }}>
              <input placeholder="Name" value={row.worker_name} onChange={(e) => updateLabor(index, { worker_name: e.target.value })} />
              <input placeholder="Role / Class" value={row.role_class} onChange={(e) => updateLabor(index, { role_class: e.target.value })} />
              <input type="number" step="0.25" placeholder="ST" value={row.st_hours} onChange={(e) => updateLabor(index, { st_hours: Number(e.target.value) })} />
              <input type="number" step="0.25" placeholder="OT" value={row.ot_hours} onChange={(e) => updateLabor(index, { ot_hours: Number(e.target.value) })} />
              <input placeholder="Notes" value={row.notes} onChange={(e) => updateLabor(index, { notes: e.target.value })} />
              <button onClick={() => setForm((prev) => ({ ...prev, labor: prev.labor.filter((_, i) => i !== index) }))}>Remove</button>
            </div>
          ))}
          <button onClick={() => setForm((prev) => ({ ...prev, labor: [...prev.labor, defaultLabor()] }))}>+ Add Labor Row</button>
          <p>Total ST: {totals.st.toFixed(2)} | Total OT: {totals.ot.toFixed(2)} | Total Hours: {totals.total.toFixed(2)}</p>
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Materials</h2>
          {form.materials.map((row, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 2fr auto", gap: ".5rem", marginBottom: ".5rem" }}>
              <input type="number" step="0.01" placeholder="Qty" value={row.qty ?? ""} onChange={(e) => updateMaterial(index, { qty: Number(e.target.value) || null })} />
              <input placeholder="Unit" value={row.unit} onChange={(e) => updateMaterial(index, { unit: e.target.value })} />
              <input placeholder="Description" value={row.description} onChange={(e) => updateMaterial(index, { description: e.target.value })} />
              <input placeholder="Notes" value={row.notes} onChange={(e) => updateMaterial(index, { notes: e.target.value })} />
              <button onClick={() => setForm((prev) => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }))}>Remove</button>
            </div>
          ))}
          <button onClick={() => setForm((prev) => ({ ...prev, materials: [...prev.materials, defaultMaterial()] }))}>+ Add Material Row</button>
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Daily Notes / Issues / Conditions</h2>
          <textarea rows={4} value={form.daily_notes ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, daily_notes: e.target.value }))} />
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Photos</h2>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              if (!files.length || !(reportId || form.id)) {
                setStatusText("Save draft first before uploading photos.");
                return;
              }

              for (const file of files) {
                const result = await uploadDataUrl(file, "photo");
                setPhotos((prev) => [
                  ...prev,
                  { id: `${Date.now()}-${file.name}`, storage_path: result.storage_path, caption: null, created_at: new Date().toISOString() },
                ]);
              }
            }}
          />
          <p>Uploaded photos: {photos.length}</p>
          <ul>
            {photos.map((photo) => (
              <li key={photo.id}>{photo.storage_path}</li>
            ))}
          </ul>
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Signatures</h2>
          <label>Guardian Lead / Foreman Signature</label>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !(reportId || form.id)) {
                setStatusText("Save draft first before uploading signatures.");
                return;
              }
              const result = await uploadDataUrl(file, "signature");
              setForm((prev) => ({
                ...prev,
                guardian_signature_url: result.storage_path,
                guardian_signed_at: new Date().toISOString(),
              }));
            }}
          />

          <label>
            <input
              type="checkbox"
              checked={!!form.client_not_available}
              onChange={(e) => setForm((prev) => ({ ...prev, client_not_available: e.target.checked }))}
            />
            Client / GC not available on site
          </label>

          {!form.client_not_available && (
            <>
              <label>Customer Acknowledgment Signature</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !(reportId || form.id)) {
                    setStatusText("Save draft first before uploading signatures.");
                    return;
                  }
                  const result = await uploadDataUrl(file, "signature");
                  setForm((prev) => ({
                    ...prev,
                    customer_signature_url: result.storage_path,
                    customer_signed_at: new Date().toISOString(),
                  }));
                }}
              />
            </>
          )}
        </article>

        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Review & Submit</h2>
          <p><strong>Project:</strong> {form.project_name_snapshot || "—"}</p>
          <p><strong>Scope:</strong> {form.scope_of_work || "—"}</p>
          <p><strong>Labor Totals:</strong> ST {totals.st.toFixed(2)} / OT {totals.ot.toFixed(2)} / Total {totals.total.toFixed(2)}</p>
          <p><strong>Materials:</strong> {form.materials.filter((m) => m.description).length} rows</p>
          <p><strong>Notes:</strong> {form.daily_notes || "—"}</p>
          <p><strong>Photo Count:</strong> {photos.length}</p>
          <p><strong>Guardian Signature:</strong> {form.guardian_signature_url ? "Captured" : "Missing"}</p>
          <p><strong>Client State:</strong> {form.client_not_available ? "Client not available" : form.customer_signature_url ? "Client signed" : "Awaiting client signature"}</p>
        </article>
      </section>
    </main>
  );
}
