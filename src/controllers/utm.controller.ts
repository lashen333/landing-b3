// src\controllers\utm.controller.ts
import { Request, Response } from "express";
import { createUtmMapping } from "../services/utm.service.js";
import { UtmMap } from "../models/utm.model.js";

export async function createUtmController(req: Request, res: Response) {
  const { baseLandingUrl, postId, variantId, platform, pageId } = req.body; //from the request body
  const data = await createUtmMapping({ baseLandingUrl, postId, variantId, platform, pageId }); //send to the service
  res.status(201).json({ ok:true, data });
}

export async function resolveUtmController(req: Request, res: Response) {   // new controller to resolve UTM slug
  const { slug } = req.params as { slug: string };
  const doc = await UtmMap.findOne({ slug }).lean() as { targetUrl: string } | null;
  if (!doc) return res.status(404).json({ ok:false, error:"Not found" });
  // TODO: optionally increment click counter here
  res.json({ ok:true, data: { targetUrl: doc.targetUrl } });
}