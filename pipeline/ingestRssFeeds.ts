import type { Item } from "rss-parser";
import { supabase } from "@/lib/db";
import { fetchFeed } from "@/lib/rss";

type NormalizedRssItem = {
  external_id: string;
  title: string;
  url: string;
  published_at: string | null;
  raw_text: string;
};

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeItem(item: Item): NormalizedRssItem | null {
  const url = item.link?.trim() ?? "";
  const externalId = (item.guid ?? url).trim();

  if (!externalId || !url) {
    return null;
  }

  const raw =
    item.content ??
    item["content:encoded"] ??
    item.contentSnippet ??
    item.summary ??
    "";

  const cleanText = stripHtml(String(raw));

  return {
    external_id: externalId,
    title: (item.title ?? "Untitled").trim(),
    url,
    published_at: toIsoDate(item.isoDate ?? item.pubDate),
    raw_text: cleanText,
  };
}

async function getOrCreateRssSource(feedUrl: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("sources")
    .select("id")
    .eq("type", "rss")
    .eq("url", feedUrl)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("sources")
    .insert({
      type: "rss",
      name: feedUrl,
      url: feedUrl,
      active: true,
      priority: 1,
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id;
}

export async function ingestRssFeeds(feedUrls: string[]): Promise<number> {
  let insertedCount = 0;

  for (const feedUrl of feedUrls) {
    const sourceId = await getOrCreateRssSource(feedUrl);
    const feed = await fetchFeed(feedUrl);

    const normalized = (feed.items ?? [])
      .map(normalizeItem)
      .filter((item): item is NormalizedRssItem => !!item);

    if (normalized.length === 0) continue;

    const { data: existingItems, error: existingError } = await supabase
      .from("content_items")
      .select("external_id, url")
      .eq("source_id", sourceId);

    if (existingError) throw existingError;

    const existingExternalIds = new Set(
      (existingItems ?? []).map((item) => item.external_id).filter(Boolean),
    );
    const existingUrls = new Set(
      (existingItems ?? []).map((item) => item.url).filter(Boolean),
    );

    const toInsert = normalized
      .filter(
        (item) =>
          !existingExternalIds.has(item.external_id) &&
          !existingUrls.has(item.url),
      )
      .map((item) => ({
        source_id: sourceId,
        external_id: item.external_id,
        title: item.title,
        url: item.url,
        published_at: item.published_at,
        content_type: "rss",
        raw_text: item.raw_text,
        cleaned_text: item.raw_text,
        status: "new",
      }));

    if (toInsert.length === 0) continue;

    const { error: insertError } = await supabase
      .from("content_items")
      .insert(toInsert);

    if (insertError) throw insertError;

    insertedCount += toInsert.length;
  }

  return insertedCount;
}
