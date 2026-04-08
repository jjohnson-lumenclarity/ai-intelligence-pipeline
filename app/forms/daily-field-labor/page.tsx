import Link from "next/link";
import { listDailyFieldReports } from "@/lib/forms/repository";
import StatusBadge from "@/components/forms/StatusBadge";
import type { ReportStatus } from "@/lib/forms/types";

export default async function DailyFieldLaborListPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params.status as ReportStatus | undefined;
  const reports = await listDailyFieldReports(status);

  return (
    <main>
      <h1>Daily Field Labor Reports</h1>
      <p>
        <Link href="/forms/daily-field-labor/new">+ New Report</Link>
      </p>
      <p>
        Filters: <Link href="/forms/daily-field-labor">All</Link> | <Link href="/forms/daily-field-labor?status=draft">Drafts</Link> |{" "}
        <Link href="/forms/daily-field-labor?status=submitted">Submitted</Link>
      </p>

      <div style={{ display: "grid", gap: ".75rem", marginTop: "1rem" }}>
        {reports.map((report) => (
          <Link key={report.id} href={`/forms/daily-field-labor/${report.id}`} style={{ border: "1px solid #ddd", borderRadius: 12, padding: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", alignItems: "center" }}>
              <div>
                <strong>{report.project_name_snapshot ?? "Untitled Project"}</strong>
                <p style={{ margin: 0 }}>Date: {report.report_date}</p>
                <p style={{ margin: 0 }}>Job #: {report.job_number ?? "—"}</p>
              </div>
              <StatusBadge status={report.status} />
            </div>
          </Link>
        ))}
        {reports.length === 0 && <p>No reports found.</p>}
      </div>
    </main>
  );
}
