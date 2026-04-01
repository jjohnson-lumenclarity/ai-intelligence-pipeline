import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { ingestRssFeeds } from "@/pipeline/ingestRssFeeds";
import { ingestYouTubeChannels } from "@/pipeline/ingestYouTubeChannels";
import { summarizeContentItem } from "@/pipeline/summarizeContentItem";
import {
  generateFinalReport,
  synthesizeTopItems,
  type TopSummarizedItem,
} from "@/pipeline/reportBuilder";

function parseList(input?: string): string[] {
  return (input ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseSummaryText(summaryText: string): string {
  try {
    const parsed = JSON.parse(summaryText) as { summary?: string };
    return parsed.summary ?? summaryText;
  } catch {
    return summaryText;
  }
}

export async function POST() {
  const weekOfDate = new Date().toISOString().slice(0, 10);

  const { data: run, error: runCreateError } = await supabase
    .from("report_runs")
    .insert({
      run_status: "running",
      period_start: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runCreateError || !run) {
    return NextResponse.json(
      { status: "failed", error: "Could not create report run" },
      { status: 500 }
    );
  }

  try {
    const rssUrls = parseList(process.env.RSS_FEED_URLS);
    const youtubeChannels = parseList(process.env.YOUTUBE_CHANNELS);

    await ingestRssFeeds(rssUrls);
    await ingestYouTubeChannels(youtubeChannels);

    const { data: latestItems, error: latestItemsError } = await supabase
      .from("content_items")
      .select("id, title, url, cleaned_text, published_at")
      .order("published_at", { ascending: false })
      .limit(30);

    if (latestItemsError) throw latestItemsError;

    for (const item of latestItems ?? []) {
      await summarizeContentItem({
        id: item.id,
        title: item.title,
        url: item.url,
        content_text: item.cleaned_text,
      });
    }

    const { data: summarizedRows, error: summarizedRowsError } = await supabase
      .from("item_summaries")
      .select("content_item_id, summary, content_items(title, published_at)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (summarizedRowsError) throw summarizedRowsError;

    const topItems: TopSummarizedItem[] = (summarizedRows ?? []).map((row) => {
      const contentItem = Array.isArray(row.content_items)
        ? row.content_items[0]
        : row.content_items;

      return {
        content_item_id: row.content_item_id,
        title: contentItem?.title,
        published_at: contentItem?.published_at,
        summary_text: parseSummaryText(row.summary),
        source: "mixed",
      };
    });

    const insights = await synthesizeTopItems(topItems);
    if (!insights) throw new Error("Could not synthesize insights");

    const report = await generateFinalReport(
      insights,
      run.id,
      weekOfDate
    );
    if (!report) throw new Error("Could not generate final report");

    await supabase
      .from("report_runs")
      .update({
        run_status: "completed",
        period_end: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({
      status: "completed",
      report_id: run.id,
    });

  } catch (error) {
    await supabase
      .from("report_runs")
      .update({
        run_status: "failed",
        period_end: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
