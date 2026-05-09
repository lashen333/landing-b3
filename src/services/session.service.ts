// src\services\session.service.ts
/*
Job this file
1.skip the localhost ips
2.device detection ad geo+ip logic
*/
// src/services/session.service.ts
import { Session } from "../models/session.model.js";
import { lookupGeoImproved } from "./geoService.js";
import { getDeviceInfo } from "../utils/device.js";
import { getClientIp } from "../utils/ip.js";

// ------- Helpers -------
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

const buildLocation = (
  city?: string,
  country?: string,
  countryCode?: string
): string =>
  [city, country || countryCode].filter(Boolean).join(", ") || "Unknown";

// -------- START SESSION SERVICE --------
export async function startSessionService(req: any) {
  const { sessionId, utm, pageUrl, referrer, variant, lat, lon } =
    (req.body ?? {}) as any;

  if (!sessionId) throw new Error("MissingSessionId");

  // Device info
  const ua = req.get("user-agent") || "";
  const { deviceType, os, browser, device } = getDeviceInfo(ua);

  // IP + GEO
  const ip = getClientIp(req);
  const geo = await lookupGeoImproved(
    isPrivateIp(ip) ? undefined : ip,
    lat,
    lon
  );

  const location = buildLocation(
    geo.city,
    geo.country,
    geo.countryCode
  );

  const update = {
    $setOnInsert: { sessionId, startTime: new Date() },
    $set: {
      // UTM
      utm_source: utm?.utm_source ?? null,
      utm_medium: utm?.utm_medium ?? null,
      utm_campaign: utm?.utm_campaign ?? null,
      utm_content: utm?.utm_content ?? null,
      utm_term: utm?.utm_term ?? null,

      // Variant
      variantId:
        variant?._id ?? (req.body as any)?.variantId ?? null,
      variantName:
        variant?.name ?? (req.body as any)?.variantName ?? null,

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

  return {
    sessionId: doc?.sessionId ?? sessionId,
    location: doc?.location ?? null,
    device: doc?.device ?? null,
  };
}

// -------- APPEND ACTIONS SERVICE --------
export async function appendActionsService(sessionId: string, body: any) {
  const exists = await Session.exists({ sessionId });
  if (!exists) throw new Error("SessionNotFound");

  const { actions } = body;

  const normalized = actions.map((a: any) => ({
    section: a.section,
    event: a.event,
    timeSpent:
      typeof a.timeSpent === "number" ? a.timeSpent : undefined,
    timestamp: a.timestamp
      ? new Date(a.timestamp)
      : new Date(),
  }));

  const updated = await Session.findOneAndUpdate(
    { sessionId },
    { $push: { actions: { $each: normalized } } },
    { new: true, projection: { _id: 1 } }
  );

  if (!updated) throw new Error("SessionNotFound");

  return {
    appended: normalized.length,
  };
}

// -------- UPDATE GEO SERVICE --------
export async function updateGeoService(sessionId: string, lat: number, lon: number) {
  const geo = await lookupGeoImproved(undefined, lat, lon);

  const location = buildLocation(
    geo.city,
    geo.country,
    geo.countryCode
  );

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

  return {
    sessionId: doc?.sessionId,
    location: doc?.location,
    geoMethod: doc?.geoMethod,
  };
}

