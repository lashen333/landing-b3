import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
});

async function test() {
  try {
    const res = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout:free", // ← Free Llama model (no Grok)
      messages: [{ role: "user", content: "Say hello from a free AI test!" }],
    });
    console.log("✅ SUCCESS! AI says:");
    console.log(res.choices[0].message.content);
  } catch (err: any) {
    console.error("❌ ERROR:", err.status, err.message);
  }
}

test();