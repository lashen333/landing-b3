// src\controllers\facebook.controller.ts
import { Request, Response } from "express";
import {
  getFacebookAuthUrl,
  exchangeCodeForLongLivedUserToken,
  fetchUserProfile,
  fetchUserPages,
  upsertIntegration
} from "../services/facebook.service.js";
import { FacebookIntegration } from "../models/fb.integration.model.js";
import { env } from "../config/env.js";

export function getFbAuthUrlController(_req: Request, res: Response) {
  res.json({ ok:true, url: getFacebookAuthUrl() });
}

export async function fbCallbackController(req: Request, res: Response) {
  const code = String(req.query.code || "");
  if (!code) return res.status(400).json({ ok:false, error:"Missing code" });

  const longLived = await exchangeCodeForLongLivedUserToken(code);
  const me = await fetchUserProfile(longLived.access_token);
  const pages = await fetchUserPages(longLived.access_token);
  await upsertIntegration(me, longLived.access_token, longLived.expires_in, pages);

  // redirect back to your dashboard
  const redirect = (env.DASHBOARD_URL) + "/dashboard/social";
  res.redirect(redirect);
}

export async function listFbPagesController(_req: Request, res: Response) {
  const doc = await FacebookIntegration.findOne().lean();
  const pages = Array.isArray(doc) ? [] : doc?.pages ?? [];
  res.json({ ok:true, data: pages });
}
