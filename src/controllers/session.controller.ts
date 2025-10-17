// src/controllers/session.controller.ts
import type { Request, Response } from "express";
import { Session } from "../models/session.model";
import { sendValidated } from "../middlewares/validate";
import {
  SessionStartResponseSchema,
  type SessionStartBody,
  AppendActionsBody,
  AppendActionsBodySchema,
  AppendActionsResponseSchema,
} from "../schemas/session.schema";
import { lookupGeoImproved } from "../services/geoService";
import { getDeviceInfo } from "../utils/device";
import { getClientIp } from "../utils/ip";

// --- small helpers (kept local to avoid “utils sprawl”) ---
const isPrivateIp = (ip: string | undefined): boolean => {
  if (!ip) return true;
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost"
  );
};

const buildLocation = (city?: string, country?: string, countryCode?: string): string =>
  [city, country || countryCode].filter(Boolean).join(", ") || "Unknown";

// ----------------------------------------------------------------

export async function startSession(
  req: Request<any, any, SessionStartBody>,
  res: Response
) {
  const { sessionId, utm, pageUrl, referrer, variant, lat, lon } = (req.body ?? {}) as any;
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: "Missing sessionId" });
  }

  // Device
  const ua = req.get("user-agent") || "";
  const { deviceType, os, browser, device } = getDeviceInfo(ua);

  // IP & Geo
  const ip = getClientIp(req);
  const geo = await lookupGeoImproved(isPrivateIp(ip) ? undefined : ip, lat, lon);

  const location = buildLocation(geo.city, geo.country, geo.countryCode);

  const update = {
    $setOnInsert: { sessionId, startTime: new Date() },
    $set: {
      // UTM
      utm_source:   utm?.utm_source ?? null,
      utm_medium:   utm?.utm_medium ?? null,
      utm_campaign: utm?.utm_campaign ?? null,
      utm_content:  utm?.utm_content ?? null,
      utm_term:     utm?.utm_term ?? null,

      // Variant (accept nested or legacy if you still send it)
      variantId:   variant?._id   ?? (req.body as any)?.variantId   ?? null,
      variantName: variant?.name  ?? (req.body as any)?.variantName ?? null,

      // Device fingerprint
      device: deviceType ?? null,
      userAgent: ua,
      osName: os.name ?? undefined,
      osVersion: os.version ?? undefined,
      browserName: browser.name ?? undefined,
      browserVersion: browser.version ?? undefined,
      deviceVendor: device.vendor ?? undefined,
      deviceModel: device.model ?? undefined,

      // Geo
      ip,
      country: geo.country || undefined,
      countryCode: geo.countryCode || undefined,
      city: geo.city || undefined,
      region: geo.region || undefined,
      lat: typeof geo.lat === "number" ? geo.lat : undefined,
      lon: typeof geo.lon === "number" ? geo.lon : undefined,
      geoMethod: geo.method,
      location,

      // Page context
      pageUrl: pageUrl ?? null,
      referrer: referrer ?? null,
    },
  };

  const doc = await Session.findOneAndUpdate(
    { sessionId },
    update,
    { upsert: true, new: true }
  ).lean();

  return sendValidated(
    res,
    SessionStartResponseSchema,
    {
      ok: true,
      session: {
        sessionId: doc?.sessionId ?? sessionId,
        location: doc?.location ?? null,
        device: doc?.device ?? null,
      },
    },
    201
  );
}

// unchanged logic, just organized & typed
export async function appendActions(
  req: Request<{ sessionId: string }, unknown, AppendActionsBody>,
  res: Response
) {
  const { sessionId } = req.params;
  const parsed = AppendActionsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "InvalidBody", issues: parsed.error.issues });
  }

  const { actions } = parsed.data;
  if (actions.length > 20) {
    return res.status(413).json({ ok: false, error: "PayloadTooLarge" });
  }

  const exists = await Session.exists({ sessionId });
  if (!exists) {
    return res.status(404).json({ ok: false, error: "SessionNotFound" });
  }

  const normalized = actions.map(a => ({
    section: a.section,
    event: a.event,
    timeSpent: typeof a.timeSpent === "number" ? a.timeSpent : undefined,
    timestamp: a.timestamp ? new Date(a.timestamp) : new Date(),
  }));

  const updated = await Session.findOneAndUpdate(
    { sessionId },
    { $push: { actions: { $each: normalized } } },
    { new: true, projection: { _id: 1 } }
  );
  if (!updated) return res.status(404).json({ ok: false, error: "SessionNotFound" });

  return sendValidated(res, AppendActionsResponseSchema, { ok: true, appended: normalized.length }, 200);
}

export async function updateGeo(
  req: Request<{ sessionId: string }, unknown, { lat: number; lon: number }>,
  res: Response
) {
  const { sessionId } = req.params;
  const { lat, lon } = req.body ?? {};
  if (!sessionId || typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ ok: false, error: "Invalid body" });
  }

  // We have GPS; IP isn’t needed for precision here
  const geo = await lookupGeoImproved(undefined, lat, lon);
  const location = buildLocation(geo.city, geo.country, geo.countryCode);

  const doc = await Session.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        country: geo.country || undefined,
        countryCode: geo.countryCode || undefined,
        city: geo.city || undefined,
        region: geo.region || undefined,
        lat: geo.lat,
        lon: geo.lon,
        geoMethod: geo.method,
        location,
      },
    },
    { new: true }
  );

  return res.json({
    ok: true,
    session: { sessionId: doc?.sessionId, location: doc?.location, geoMethod: doc?.geoMethod },
  });
}
