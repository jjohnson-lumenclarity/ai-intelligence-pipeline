import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/db";

type UploadPayload = {
  reportId: string;
  kind: "photo" | "signature";
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
  caption?: string;
};

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as UploadPayload;

    if (!payload.reportId || !payload.dataUrl) {
      return NextResponse.json({ error: "reportId and dataUrl are required" }, { status: 400 });
    }

    const decoded = decodeDataUrl(payload.dataUrl);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid dataUrl" }, { status: 400 });
    }

    const bucket = payload.kind === "signature" ? "form-signatures" : "form-photos";
    const extension = decoded.mimeType.includes("png") ? "png" : "jpg";
    const path = `${payload.reportId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, decoded.buffer, {
      upsert: false,
      contentType: decoded.mimeType,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    if (payload.kind === "photo") {
      const { error: photoError } = await supabase.from("forms_daily_field_report_photos").insert({
        report_id: payload.reportId,
        storage_path: `${bucket}/${path}`,
        caption: payload.caption ?? null,
      });
      if (photoError) throw photoError;
    }

    return NextResponse.json({ storage_path: `${bucket}/${path}`, public_url: data.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
