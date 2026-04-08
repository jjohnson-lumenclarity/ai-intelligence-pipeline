import { NextResponse } from "next/server";
import { listDailyFieldReports, upsertDailyFieldReport } from "@/lib/forms/repository";
import type { DailyFieldReportPayload, ReportStatus } from "@/lib/forms/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ReportStatus | null;
    const reports = await listDailyFieldReports(status ?? undefined);
    return NextResponse.json({ reports });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DailyFieldReportPayload;

    if (!payload.report_date) {
      return NextResponse.json({ error: "report_date is required" }, { status: 400 });
    }

    const id = await upsertDailyFieldReport(payload);
    return NextResponse.json({ id, status: payload.status ?? "draft" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save report" }, { status: 500 });
  }
}
