import { NextResponse } from "next/server";
import { generateReport } from "@/pipeline/generateReport";

export async function POST() {
  try {
    const report = await generateReport();
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
