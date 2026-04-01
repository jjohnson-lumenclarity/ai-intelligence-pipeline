import { supabase } from "@/lib/db";
import { openai } from "@/lib/openai";
import { cleanText } from "@/lib/text";

type ContentItem = {
  id: string;
  title?: string | null;
  content_text?: string | null;
  url?: string | null;
};

type ItemSummaryResult = {
  summary: string;
  key_points: string[];
  enterprise_relevance: string;
  consulting_relevance: string;
  classification: "opportunity" | "threat" | "watch";
  relevance_score: number;
  novelty_score: number;
};

const SUMMARY_JSON_SCHEMA = {
  name: "item_summary",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      key_points: { type: "array", items: { type: "string" } },
      enterprise_relevance: { type: "string" },
      consulting_relevance: { type: "string" },
      classification: { type: "string", enum: ["opportunity", "threat", "watch"] },
      relevance_score: { type: "integer", minimum: 1, maximum: 10 },
      novelty_score: { type: "integer", minimum: 1, maximum: 10 },
    },
    required: [
      "summary",
      "key_points",
      "enterprise_relevance",
      "consulting_relevance",
      "classification",
      "relevance_score",
      "novelty_score",
    ],
  },
} as const;

function safeParseSummaryJson(input: string): ItemSummaryResult | null {
  try {
    const parsed = JSON.parse(input) as Partial<ItemSummaryResult>;

    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.key_points) ||
      typeof parsed.enterprise_relevance !== "string" ||
      typeof parsed.consulting_relevance !== "string" ||
      !["opportunity", "threat", "watch"].includes(String(parsed.classification)) ||
      typeof parsed.relevance_score !== "number" ||
      typeof parsed.novelty_score !== "number"
    ) {
      return null;
    }

    return {
      summary: parsed.summary,
      key_points: parsed.key_points.map((point) => String(point)),
      enterprise_relevance: parsed.enterprise_relevance,
      consulting_relevance: parsed.consulting_relevance,
      classification: parsed.classification as ItemSummaryResult["classification"],
      relevance_score: Math.min(10, Math.max(1, Math.round(parsed.relevance_score))),
      novelty_score: Math.min(10, Math.max(1, Math.round(parsed.novelty_score))),
    };
  } catch {
    return null;
  }
}

export async function summarizeContentItem(contentItem: ContentItem): Promise<ItemSummaryResult | null> {
  try {
    const cleanedText = cleanText(contentItem.content_text ?? "");
    if (!cleanedText) {
      return null;
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      text: {
        format: {
          type: "json_schema",
          name: SUMMARY_JSON_SCHEMA.name,
          schema: SUMMARY_JSON_SCHEMA.schema,
          strict: true,
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are an enterprise intelligence analyst. Return strict JSON only. Keep output concise, concrete, and decision-oriented.",
        },
        {
          role: "user",
          content: `Summarize this content item for enterprise and consulting relevance.\n\nTitle: ${contentItem.title ?? "Untitled"}\nURL: ${contentItem.url ?? "N/A"}\n\nContent:\n${cleanedText}`,
        },
      ],
    });

    const parsed = safeParseSummaryJson(response.output_text);
    if (!parsed) {
      return null;
    }

    const { error } = await supabase.from("item_summaries").insert({
      content_item_id: contentItem.id,
      model: "gpt-4.1-mini",
      prompt_version: "v1-structured",
      summary_text: JSON.stringify({ cleaned_text: cleanedText, ...parsed }),
    });

    if (error) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
