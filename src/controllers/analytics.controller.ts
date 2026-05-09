// src/controllers/analytics.controller.ts

/*
Job in this file
1.Req and Res handling for analytics endpoints
2.Manages SSE streaming (headers + res.write)
 */

import type { Request, Response } from "express";
import { Session } from "../models/session.model.js";
import {
  fetchOverview,
  fetchOverviewMinimal,
  getBreakdown,
  getGeoOverview,
  getLatestActions,
  getGeoPoints,
} from "../services/analytics.service.js";

// GET /api/analytics/overview
export async function analyticsOverview(_req: Request, res: Response) {
  const overview = await fetchOverview();
  return res.json(overview);
}

// GET /api/analytics/geo
export async function analyticsGeo(_req: Request, res: Response) {
  const full = await getGeoOverview();
  return res.json({ ok: true, geo: full });
}

// GET /api/analytics/devices
export async function analyticsDevices(_req: Request, res: Response) {
  const list = await getBreakdown("device");
  return res.json({ ok: true, devices: list });
}

// GET /api/analytics/actions
export async function analyticsActions(_req: Request, res: Response) {
  const list = await getLatestActions(50);
  return res.json({ ok: true, actions: list });
}

// GET /api/analytics/geo/points
export async function analyticsGeoPoints(_req: Request, res: Response) {
  const points = await getGeoPoints();
  return res.json({ ok: true, points });
}

// GET /api/analytics/stream  (SSE endpoint)  this for the dashboard live updates
export async function analyticsStream(req: Request, res: Response) {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let alive = true;
  req.on("close", () => {
    alive = false;
  });

  // helper to send snapshot
  const sendSnapshot = async () => {
    const snapshot = await fetchOverviewMinimal();
    if (!alive) return;
    res.write(`event: overview\n`);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  // heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    if (!alive) return;
    res.write(`event: ping\ndata: {}\n\n`);
  }, 15000);

  // try MongoDB change streams
  let changeStream: any;
  try {
    changeStream = Session.watch([], { fullDocument: "updateLookup" });
    changeStream.on("change", () => {
      void sendSnapshot();
    });
  } catch {
    // fallback: poll every 5 seconds
    const poller = setInterval(() => {
      void sendSnapshot();
    }, 5000);
    req.on("close", () => clearInterval(poller));
  }

  // cleanup when client disconnects
  req.on("close", () => {
    clearInterval(heartbeat);
    changeStream?.close?.();
  });

  // send first snapshot immediately
  void sendSnapshot();
}
