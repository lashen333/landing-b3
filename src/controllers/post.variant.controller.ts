// src\controllers\post.variant.controller.ts
import { Request, Response } from "express";
import { generatePostVariants } from "../services/postvariant.service.js";

export async function generateVariantsController(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { count } = (req.body ?? {}) as { count?: number };

  try {
    const post = await generatePostVariants(id, Number(count) || 5);
    return res.json({ ok: true, data: post.variants });
  } catch (err: any) {
    console.error("generateVariantsController error:", err);

    if (err.message === "Post not found" || err.message === "No analysis found; analyze first") {
      return res.status(400).json({ ok: false, error: err.message });
    }

    if (err.statusCode === 429 || err.message === "OPENAI_RATE_LIMIT" || err.code === "rate_limit_exceeded") {
      return res
        .status(429)
        .json({ ok: false, error: "AI rate limit reached. Please try again after a short break." });
    }

    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
