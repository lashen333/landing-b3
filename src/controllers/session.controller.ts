// src\controllers\session.controller.ts
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

// helper
const makeLocationString = (city?: string, country?: string) =>
  [city, country].filter(Boolean).join(", ");

function getClientIp(req: Request) {
  const xfwd = (req.headers["x-forwarded-for"] as string) || "";
  return (xfwd.split(",")[0] || req.socket.remoteAddress || "").trim();
}

export async function startSession(
  req: Request<any, any, SessionStartBody>,   // avoids ParamsDictionary import
  res: Response
) {
  const { sessionId, utm, pageUrl, referrer, variant, lat, lon } = (req.body ?? {}) as any;
  if (!sessionId) return res.status(400).json({ ok: false, message: "sessionId required" });

  // Device parsing
  const ua = req.get("User-Agent") || "";
  const { deviceType, os, browser, device } = getDeviceInfo(ua);

  //geo
  const ip = getClientIp(req);
  const geo = await lookupGeoImproved(ip, lat, lon);
  const country = geo.country || undefined;
  const city = geo.city || undefined;
  const region = geo.region || undefined;
  const locStr = makeLocationString(city, country);

  const update = {
    $setOnInsert:{ sessionId, startTime: new Date() },
    $set:{
      // UTM fields 
      utm_source:   utm?.utm_source ?? null,
      utm_medium:   utm?.utm_medium ?? null,
      utm_campaign: utm?.utm_campaign ?? null,
      utm_content:  utm?.utm_content ?? null,
      utm_term:     utm?.utm_term ?? null,

      // NEW: accept either nested { variant: {_id, name} } or legacy variantId/variantName on body
      variantId:   variant?._id   ?? (req.body as any)?.variantId   ?? null,
      variantName: variant?.name  ?? (req.body as any)?.variantName ?? null,

      device: deviceType,
      userAgent: ua,
      osName: os.name ?? undefined,
      osVersion: os.version ?? undefined,
      browserName: browser.name ?? undefined,
      browserVersion: browser.version ?? undefined,
      deviceVendor: device.vendor ?? undefined,
      deviceModel: device.model ?? undefined,

      //Geo
      ip,
      location: locStr || "Unknown",
      country, city, region,
      lat: typeof geo.lat === "number" ? geo.lat : undefined,
      lon: typeof geo.lon === "number" ? geo.lon : undefined,
      geoMethod: geo.method,

      pageUrl: pageUrl ?? null,
      referrer: referrer ?? null,
    }
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

export async function appendActions(
    req:Request<{sessionId:string},unknown,AppendActionsBody>,
    res:Response
){
    const {sessionId} = req.params;
    const parsed = AppendActionsBodySchema.safeParse(req.body);
    if(!parsed.success){
        return res.status(400).json({ok:false,error:"InvalidBody",issues:parsed.error.issues});

    }
    const {actions} = parsed.data;

    if(actions.length > 20){
        return res.status(413).json({
            ok:false,
            error:"PayloadTooLarge",
        });
    }
    const exists = await Session.exists({sessionId});
    if(!exists){
        return res.status(404).json({
            ok:false,
            error:"SessionNotFound",

        });
    }
    const normalized = actions.map(a => ({
        section:a.section,
        event:a.event,
        timeSpent:typeof a.timeSpent === "number" ? a.timeSpent:undefined,
        timestamp:a.timestamp ? new Date(a.timestamp):new Date(),
    }));

    const updated = await Session.findOneAndUpdate(
        {sessionId},
        {$push:{actions:{$each:normalized}}},
        {new:true,projection:{_id:1}}
    );
    if(!updated) return res.status(404).json({ok:false,error:"SessionNotFound"});

    return sendValidated(
        res,
        AppendActionsResponseSchema,
        {ok:true,appended:normalized.length},
        200
    );
}
export async function updateGeo(req: Request<{ sessionId: string }, unknown, { lat: number; lon: number }>, res: Response) {
  const { sessionId } = req.params;
  const { lat, lon } = req.body ?? {};
  if (!sessionId || typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ ok:false, error:"Invalid body" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || (req.socket?.remoteAddress ?? "");
  const geo = await lookupGeoImproved(ip, lat, lon);
  const location = makeLocationString(geo.city, geo.country);

  const doc = await Session.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        country: geo.country || undefined,
        city: geo.city || undefined,
        region: geo.region || undefined,
        lat: geo.lat,
        lon: geo.lon,
        geoMethod: geo.method,
        location: location || undefined,
      }
    },
    { new: true }
  );
  return res.json({ ok:true, session: { sessionId: doc?.sessionId, location: doc?.location, geoMethod: doc?.geoMethod } });
}
