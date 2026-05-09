// src/controllers/campaigns.controller.ts

/*
Job in this file
1. Req and Res handling for campaigns endpoints
*/

import type { Request, Response } from "express";
import {
  getCampaignsOverview,
  getCampaignDetail,
} from "../services/campaigns.service.js";

// GET /api/campaigns/overview
export async function campaignsOverview(req: Request, res: Response) {
  const data = await getCampaignsOverview();
  return res.json({ ok: true, ...data });
}

// GET /api/campaigns/detail?source=facebook&campaign=black-friday
export async function campaignDetail(req: Request, res: Response) {
  const sourceQ = (req.query.source as string) ?? "direct";
  const campaignQ = (req.query.campaign as string) ?? "(none)";

  const data = await getCampaignDetail(sourceQ, campaignQ);
  return res.json({ ok: true, ...data });
}
