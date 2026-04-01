import { openai } from "@/lib/openai";
import { supabase } from "@/lib/db";

export type TopSummarizedItem = {
  content_item_id: string;
  title?: string | null;
  source?: string | null;
  published_at?: string | null;
  summary_text: string;
};

export type SynthesizedInsights = {
  major_themes: string[];
  enterprise_signals: string[];
  consulting_implications: string[];
  opportunities: string[];
  risks: string[];
};

export type FinalReportOutput = {
  title: string;
  markdown: string;
  sections: {
    major_developments: string[];
    enterprise_adoption_signals: string[];
    implications_for_consulting_firms: string[];
    implications_for_lumenclarity: string[];
    opportunities: string[];
    risks_competitive_threats: string[];
    recommended_actions: string[];
    source_notes: string[];
  };
};

const INSIGHTS_SCHEMA = {
  name: "synthesized_insights",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      major_themes: { type: "array", items: { type: "string" } },
      enterprise_signals: { type: "array", items: { type: "string" } },
      consulting_implications: { type: "array", items: { type: "string" } },
      opportunities: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
    },
    required: ["major_themes", "enterprise_signals", "consulting_implications", "opportunities", "risks"],
  },
} as const;

const REPORT_SCHEMA = {
  name: "final_report",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      markdown: { type: "string" },
      sections: {
        type: "object",
        additionalProperties: false,
        properties: {
          major_developments: { type: "array", items: { type: "string" } },
          enterprise_adoption_signals: { type: "array", items: { type: "string" } },
          implications_for_consulting_firms: { type: "array", items: { type: "string" } },
          implications_for_lumenclarity: { type: "array", items: { type: "string" } },
          opportunities: { type: "array", items: { type: "string" } },
          risks_competitive_threats: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
          source_notes: { type: "array", items: { type: "string" } },
        },
        required: [
          "major_developments",
          "enterprise_adoption_signals",
          "implications_for_consulting_firms",
          "implications_for_lumenclarity",
          "opportunities",
          "risks_competitive_threats",
          "recommended_actions",
          "source_notes",
        ],
      },
    },
    required: ["title", "markdown", "sections"],
  },
} as const;

function safeParseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export async function synthesizeTopItems(items: TopSummarizedItem[]): Promise<SynthesizedInsights | null> {
  const selected = items.slice(0, 10);
  if (selected.length < 5) {
    return null;
  }

  const synthesisInput = selected
    .map(
      (item, index) =>
        `[${index + 1}] ${item.title ?? "Untitled"} (${item.published_at ?? "unknown date"})\nSource: ${item.source ?? "unknown"}\nSummary: ${item.summary_text}`,
    )
    .join("\n\n");

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      text: {
        format: {
          type: "json_schema",
          name: INSIGHTS_SCHEMA.name,
          schema: INSIGHTS_SCHEMA.schema,
          strict: true,
        },
      },
      input: [
        {
          role: "system",
          content:
            "Extract cross-source patterns. Avoid duplication. Focus on practical enterprise and consulting business signals.",
        },
        {
          role: "user",
          content: `Analyze the following summarized items and return concise synthesis insights:\n\n${synthesisInput}`,
        },
      ],
    });

    return safeParseJson<SynthesizedInsights>(response.output_text);
  } catch {
    return null;
  }
}

export async function generateFinalReport(
  insights: SynthesizedInsights,
  reportRunId: string,
  weekOfDate: string,
): Promise<FinalReportOutput | null> {
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      text: {
        format: {
          type: "json_schema",
          name: REPORT_SCHEMA.name,
          schema: REPORT_SCHEMA.schema,
          strict: true,
        },
      },
      input: [
        {
          role: "system",
          content:
            "Write a concise, actionable AI intelligence brief for a 5-minute read. No fluff, no repetition, practical business insight only.",
        },
        {
          role: "user",
          content: `Using these synthesized insights, produce the report in this exact structure:\n\nAI Intelligence Brief — Week of [DATE]\n\n1. Major Developments\n2. Enterprise AI Adoption Signals\n3. Implications for Consulting Firms\n4. Implications for LumenClarity\n5. Opportunities\n6. Risks / Competitive Threats\n7. Recommended Actions (3)\n8. Source Notes\n\nWeek of date: ${weekOfDate}\n\nInsights JSON:\n${JSON.stringify(insights)}`,
        },
      ],
    });

    const parsed = safeParseJson<FinalReportOutput>(response.output_text);
    if (!parsed) {
      return null;
    }

    const { error } = await supabase.from("reports").insert({
      report_run_id: reportRunId,
      title: parsed.title || `AI Intelligence Brief — Week of ${weekOfDate}`,
      content: parsed.markdown,
    });

    if (error) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
