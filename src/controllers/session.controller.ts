// src\controllers\session.controller.ts

/*
Job in this file
1.Req and Res handling for session endpoints
*/

import type { Request, Response } from "express";
import {
  startSessionService,
  appendActionsService,
  updateGeoService,
} from "../services/session.service.js";
import {
  SessionStartResponseSchema,
  AppendActionsBodySchema,
  AppendActionsResponseSchema,
} from "../schemas/session.schema.js";
import { sendValidated } from "../middlewares/validate.js";

// ---- START SESSION ----
export async function startSession(req: Request, res: Response) {
  try {
    const session = await startSessionService(req);

    return sendValidated(
      res,
      SessionStartResponseSchema,
      { ok: true, session },
      201
    );
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

// ---- APPEND ACTIONS ----
export async function appendActions(req: Request, res: Response) {
  const { sessionId } = req.params;

  const parsed = AppendActionsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "InvalidBody",
      issues: parsed.error.issues,
    });
  }

  try {
    const result = await appendActionsService(sessionId, parsed.data);

    return sendValidated(
      res,
      AppendActionsResponseSchema,
      { ok: true, ...result },
      200
    );
  } catch (err: any) {
    return res.status(404).json({ ok: false, error: err.message });
  }
}

// ---- UPDATE GEO ----
export async function updateGeo(req: Request, res: Response) {
  const { sessionId } = req.params;
  const { lat, lon } = req.body;

  if (!sessionId || typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ ok: false, error: "InvalidBody" });
  }

  try {
    const result = await updateGeoService(sessionId, lat, lon);
    return res.json({ ok: true, session: result });
  } catch (err: any) {
    return res.status(404).json({ ok: false, error: err.message });
  }
}
