import { NextResponse } from "next/server";
import { getDailyFieldReport, upsertDailyFieldReport } from "@/lib/forms/repository";
import type { DailyFieldReportPayload } from "@/lib/forms/types";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const report = await getDailyFieldReport(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load report" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as DailyFieldReportPayload;
    const savedId = await upsertDailyFieldReport({ ...payload, id });
    return NextResponse.json({ id: savedId, status: payload.status ?? "draft" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update report" }, { status: 500 });
  }
}
