import { openai } from "@/lib/openai";
import { SYNTHESIS_PROMPT } from "@/lib/prompts";

export async function synthesize(summaries: string[]) {
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: SYNTHESIS_PROMPT },
      { role: "user", content: summaries.join("\n\n") },
    ],
  });

  return response.output_text;
}
