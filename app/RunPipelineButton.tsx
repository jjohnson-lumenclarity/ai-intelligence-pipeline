"use client";

import { useState } from "react";

export default function RunPipelineButton() {
  const [status, setStatus] = useState<string>("");

  const runPipeline = async () => {
    setStatus("Running...");

    try {
      const response = await fetch("/api/run-now", { method: "POST" });
      const json = (await response.json()) as { status: string; report_id?: string | null; error?: string };

      if (!response.ok) {
        setStatus(`Failed: ${json.error ?? "Unknown error"}`);
        return;
      }

      setStatus(`Done. Report ID: ${json.report_id ?? "n/a"}`);
      window.location.reload();
    } catch {
      setStatus("Failed: network error");
    }
  };

  return (
    <div>
      <button onClick={runPipeline}>Run Pipeline</button>
      <p>{status}</p>
    </div>
  );
}
