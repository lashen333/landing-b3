// src\controllers\publish.controller.ts
import { Request, Response } from "express";
import { publishToFacebook } from "../services/publish.service.js";

export async function publishFacebookController(req: Request, res: Response) {
  const { postId, variantId, pageId, mode } = req.body;
  const out = await publishToFacebook({ postId, variantId, pageId, mode });
  res.status(201).json({ ok: true, data: out });
}
