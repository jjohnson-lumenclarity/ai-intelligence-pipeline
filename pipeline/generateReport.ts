import { supabase } from "@/lib/db";
import { ingest } from "@/pipeline/ingest";
import { summarize } from "@/pipeline/summarize";
import { synthesize } from "@/pipeline/synthesize";

export async function generateReport() {
  const data = await ingest({
    rssUrls: [],
    youtubeVideoIds: [],
  });

  const rssSummaries = await Promise.all(
    data.rssItems.flatMap((feed) =>
      (feed.items ?? [])
        .slice(0, 5)
        .map((item) => summarize(`${item.title ?? "Untitled"}\n${item.contentSnippet ?? ""}`)),
    ),
  );

  const youtubeSummaries = await Promise.all(data.youtubeTranscripts.map((text) => summarize(text)));

  const report = await synthesize([...rssSummaries, ...youtubeSummaries]);

  const { error } = await supabase.from("reports").insert({
    content: report,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }

  return report;
}
