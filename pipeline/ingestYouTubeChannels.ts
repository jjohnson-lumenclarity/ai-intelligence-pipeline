import { supabase } from "@/lib/db";
import { fetchFeed } from "@/lib/rss";
import { fetchYouTubeTranscript } from "@/lib/youtube";

type NormalizedYouTubeItem = {
  external_id: string;
  title: string;
  url: string;
  published_at: string | null;
  raw_text: string;
  quality: "high" | "low";
};

function toIsoDate(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseVideoId(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "") || null;
    }

    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveChannelId(channelInput: string): Promise<string> {
  const trimmed = channelInput.trim();

  if (/^UC[\w-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.startsWith("http")) {
    throw new Error(`Unsupported channel input: ${channelInput}`);
  }

  const url = new URL(trimmed);
  if (url.pathname.startsWith("/channel/")) {
    const channelId = url.pathname.split("/")[2];
    if (channelId) return channelId;
  }

  const response = await fetch(trimmed);
  if (!response.ok) {
    throw new Error(`Unable to resolve channel: ${channelInput}`);
  }

  const html = await response.text();
  const match = html.match(/"channelId":"(UC[\w-]{20,})"/);
  if (!match?.[1]) {
    throw new Error(`Could not find channelId for: ${channelInput}`);
  }

  return match[1];
}

async function getOrCreateYouTubeSource(channelInput: string, channelId: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("sources")
    .select("id")
    .eq("source_type", "youtube")
    .eq("external_id", channelId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("sources")
    .insert({
      source_type: "youtube",
      name: channelInput,
      url: channelInput,
      external_id: channelId,
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id;
}

async function normalizeVideoItem(item: { title?: string; link?: string; isoDate?: string; contentSnippet?: string }) {
  const url = item.link?.trim() ?? "";
  const externalId = parseVideoId(url);

  if (!url || !externalId) {
    return null;
  }

  try {
    const transcript = await fetchYouTubeTranscript(externalId);
    return {
      external_id: externalId,
      title: (item.title ?? "Untitled").trim(),
      url,
      published_at: toIsoDate(item.isoDate),
      raw_text: transcript,
      quality: "high",
    } satisfies NormalizedYouTubeItem;
  } catch {
    const fallback = (item.contentSnippet ?? "").trim();
    if (!fallback) {
      return null;
    }

    return {
      external_id: externalId,
      title: (item.title ?? "Untitled").trim(),
      url,
      published_at: toIsoDate(item.isoDate),
      raw_text: fallback,
      quality: "low",
    } satisfies NormalizedYouTubeItem;
  }
}

export async function ingestYouTubeChannels(channelInputs: string[], maxVideos = 5): Promise<number> {
  let insertedCount = 0;

  for (const channelInput of channelInputs) {
    const channelId = await resolveChannelId(channelInput);
    const sourceId = await getOrCreateYouTubeSource(channelInput, channelId);
    const uploadsFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const feed = await fetchFeed(uploadsFeedUrl);

    const latestItems = (feed.items ?? []).slice(0, Math.max(1, Math.min(maxVideos, 5)));
    const normalized = (
      await Promise.all(
        latestItems.map((item) =>
          normalizeVideoItem({
            title: item.title,
            link: item.link,
            isoDate: item.isoDate,
            contentSnippet: item.contentSnippet,
          }),
        ),
      )
    ).filter((item): item is NormalizedYouTubeItem => !!item);

    if (normalized.length === 0) continue;

    const { data: existingItems, error: existingError } = await supabase
      .from("content_items")
      .select("source_item_id, url")
      .eq("source_id", sourceId);

    if (existingError) throw existingError;

    const existingExternalIds = new Set((existingItems ?? []).map((item) => item.source_item_id));
    const existingUrls = new Set((existingItems ?? []).map((item) => item.url));

    const toInsert = normalized
      .filter((item) => !existingExternalIds.has(item.external_id) && !existingUrls.has(item.url))
      .map((item) => ({
        source_id: sourceId,
        source_item_id: item.external_id,
        title: item.title,
        url: item.url,
        content_text: item.raw_text,
        published_at: item.published_at,
        raw_payload: {
          quality: item.quality,
          source: "youtube",
        },
      }));

    if (toInsert.length === 0) continue;

    const { error: insertError } = await supabase.from("content_items").insert(toInsert);
    if (insertError) throw insertError;

    insertedCount += toInsert.length;
  }

  return insertedCount;
}
