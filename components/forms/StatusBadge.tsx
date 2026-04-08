import type { ReportStatus } from "@/lib/forms/types";

const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pm_reviewed: "PM Reviewed",
  client_signed: "Client Signed",
  sent_to_accounting: "Sent to Accounting",
};

export default function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.55rem",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #ccc",
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
