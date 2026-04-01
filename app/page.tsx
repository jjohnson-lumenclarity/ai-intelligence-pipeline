import { supabase } from "@/lib/db";
import RunPipelineButton from "@/app/RunPipelineButton";

export default async function DashboardPage() {
  const [{ count: sourcesCount }, { count: contentItemsCount }, { data: latestReport }] =
    await Promise.all([
      supabase.from("sources").select("*", { count: "exact", head: true }),
      supabase.from("content_items").select("*", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("id, title, content, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return (
    <main>
      <h1>AI Intelligence Pipeline</h1>
      <p>Total sources: {sourcesCount ?? 0}</p>
      <p>Total content items: {contentItemsCount ?? 0}</p>

      <RunPipelineButton />

      <hr />

      <h2>Latest Report</h2>
      {latestReport ? (
        <article>
          <h3>{latestReport.title ?? "Untitled report"}</h3>
          <p>Created: {latestReport.created_at}</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {latestReport.content}
          </pre>
        </article>
      ) : (
        <p>No reports yet.</p>
      )}
    </main>
  );
}