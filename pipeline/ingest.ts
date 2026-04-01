import { fetchFeed } from "@/lib/rss";
import { fetchYouTubeTranscript } from "@/lib/youtube";

export async function ingest(sources: { rssUrls: string[]; youtubeVideoIds: string[] }) {
  const rssItems = await Promise.all(sources.rssUrls.map((url) => fetchFeed(url)));
  const youtubeTranscripts = await Promise.all(
    sources.youtubeVideoIds.map((videoId) => fetchYouTubeTranscript(videoId)),
  );

  return {
    rssItems,
    youtubeTranscripts,
  };
}
