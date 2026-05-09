import OpenAI from "openai";
import "dotenv/config";

function mask(k?: string) {
  if (!k) return "MISSING";
  return k.slice(0, 10) + "..." + k.slice(-6);
}

console.log("OPENAI_API_KEY:", mask(process.env.OPENAI_API_KEY1));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY1! });

(async () => {
  try {
    const res = await client.models.list();
    console.log("✅ models listed:", res.data.slice(0, 5).map(m => m.id));
  } catch (e: any) {
    console.error("❌ Error:", e.status, e.message);
    // Helpful headers if present
    const h = e?.headers;
    if (h) {
      console.log("x-ratelimit-limit-tokens:", h["x-ratelimit-limit-tokens"]);
      console.log("x-ratelimit-remaining-tokens:", h["x-ratelimit-remaining-tokens"]);
      console.log("retry-after:", h["retry-after"]);
    }
  }
})();
