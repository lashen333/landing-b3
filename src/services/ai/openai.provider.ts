// src\services\ai\openai.provider.ts
import OpenAI from "openai";
import { env } from "../../config/env.js";

const client = new OpenAI({
  apiKey: env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

function extractJson(s: string) {
  s = s.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(s);
}

/**
 * Cheap text-only analysis for a marketing post.
 */
export async function analyzePostText(inputText: string) {
  const resp = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    response_format: { type: "json_object" },
    max_tokens: 220, // keep response small
    messages: [
      {
        role: "system",
        content:
          "You analyze marketing posts and return concise JSON only. No prose, no code fences.",
      },
      {
        role: "user",
        content: `
Given the following post text (from an ad image or caption), analyze it and return ONLY JSON:

{
  "kind": "text",
  "summary": "short 1-sentence summary of the post",
  "topics": ["max 5 short topics"],
  "keywords": ["max 10 short keywords"],
  "sentiment": "positive" | "neutral" | "negative",
  "safety": ["max 5 flags, or [] if none"]
}

Rules:
- Base everything ONLY on the text.
- Strings max 120 chars.
- Arrays must be short as defined.
- JSON only, no comments.

Post text:
${inputText}
`.trim(),
      },
    ],
  });

  const text = resp.choices[0]?.message?.content ?? "{}";
  const parsed = extractJson(text);

  return {
    kind: "text" as const,
    summary: parsed.summary ?? "",
    topics: parsed.topics ?? [],
    keywords: parsed.keywords ?? [],
    sentiment: parsed.sentiment ?? "neutral",
    safety: parsed.safety ?? [],
    raw: parsed,
  };
}
