// src\services\ai\variant.provider.ts
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
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

export type Variant = {
  variantId: string;
  headline: string;
  caption: string;
  cta: string;
  style: string;
};

export async function generateVariantsFromAnalysis(
  analysis: any,
  count = 5
): Promise<Variant[]> {
  // compact context as we did earlier (summary, topics, ocrText...)
  const compact = {
    summary: analysis.summary ?? "",
    topics: analysis.topics ?? [],
    keywords: analysis.keywords ?? [],
    sentiment: analysis.sentiment ?? "neutral",
    ocrText: (analysis.ocrText ?? "").toString().slice(0, 800),
  };

  const userPrompt = `
You are a creative marketing copywriter.
Using the following post context, generate EXACTLY ${count} unique variants
for a social media post.

Context (JSON):
${JSON.stringify(compact, null, 2)}

Return ONLY a JSON array with ${count} items.
Each item MUST be:

{
  "headline": "short punchy headline (<= 80 chars)",
  "caption": "1–2 sentences (<= 240 chars)",
  "cta": "short call-to-action (<= 40 chars)",
  "style": "short label for tone/theme"
}
`.trim();

  try {
    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: count * 120,
      messages: [
        { role: "system", content: "Return a compact JSON array only. No prose, no code fences." },
        { role: "user", content: userPrompt },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "[]";
    const arr = extractJson(text);

    return (arr as any[]).map((v) => ({
      variantId: randomUUID(),
      headline: v.headline ?? "",
      caption: v.caption ?? "",
      cta: v.cta ?? "",
      style: v.style ?? "default",
    }));
  } catch (err: any) {
    // special handling for OpenAI rate limit
    if (err.status === 429 || err.code === "rate_limit_exceeded") {
      const e = new Error("OPENAI_RATE_LIMIT");
      (e as any).statusCode = 429;
      throw e;
    }
    throw err;
  }
}
