import { openai } from "@/lib/openai";
import { SUMMARY_PROMPT } from "@/lib/prompts";

export async function summarize(content: string) {
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: SUMMARY_PROMPT },
      { role: "user", content },
    ],
  });

  return response.output_text;
}
