// src\controllers\session.controller.ts
import type { Request, Response } from "express";
import { Session } from "../models/session.model.js";
import {UAParser} from "ua-parser-js";       // needs esModuleInterop true
import geoip from "geoip-lite";
import { sendValidated } from "../middlewares/validate";
import {
  SessionStartResponseSchema,
  type SessionStartBody,
  AppendActionsBody,
  AppendActionsBodySchema,
  AppendActionsResponseSchema,
} from "../schemas/session.schema";

function getClientIp(req: Request) {
  const xfwd = (req.headers["x-forwarded-for"] as string) || "";
  return (xfwd.split(",")[0] || req.socket.remoteAddress || "").trim();
}

export async function startSession(
  req: Request<any, any, SessionStartBody>,   // avoids ParamsDictionary import
  res: Response
) {
  const { sessionId, utm, pageUrl, referrer } = req.body || {};
  if (!sessionId) return res.status(400).json({ ok: false, message: "sessionId required" });

  const ua = req.get("user-agent") ?? "";
  const parsed = new UAParser(ua).getResult();
  const deviceType = parsed.device.type || (parsed.device.vendor ? "device" : "unknown");

  const ip = getClientIp(req);
  let location = "Unknown";
  try {
    const geo = ip && geoip.lookup(ip);
    if (geo) {
      const city = Array.isArray(geo.city) ? geo.city[0] : geo.city;
      location = [city || null, geo.country].filter(Boolean).join(", ");
    }
  } catch {}

  const doc = await Session.findOneAndUpdate(
    { sessionId },
    {
      $setOnInsert: { sessionId, startTime: new Date() },
      $set: {
        utm_source:   utm?.utm_source ?? null,
        utm_medium:   utm?.utm_medium ?? null,
        utm_campaign: utm?.utm_campaign ?? null,
        utm_content:  utm?.utm_content ?? null,
        utm_term:     utm?.utm_term ?? null,
        device: deviceType,
        userAgent: ua,
        ip,
        location,
        pageUrl: pageUrl ?? null,
        referrer: referrer ?? null,
      },
    },
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
