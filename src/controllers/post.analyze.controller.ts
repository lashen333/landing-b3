// src\controllers\post.analyze.controller.ts
import { Request, Response } from "express";
import { analyzePost } from "../services/post.analyze.service.js";

export async function analyzePostController(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { forceKind } = (req.body ?? {}) as { forceKind?: "image"|"video"|"text" };

  const data = await analyzePost(id, { forceKind });
  res.json({ ok: true, data });
}
