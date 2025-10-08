// src\routes\session.routes.ts
import {Router} from "express";
import {startSession,appendActions, updateGeo} from "../controllers/session.controller";
import { validateBody } from "../middlewares/validate";
import { SessionStartBodySchema, AppendActionsBodySchema } from "../schemas/session.schema";

const router =Router();
router.post(
    "/sessions/start",
    validateBody(SessionStartBodySchema),
    startSession);

router.post(
    "/sessions/:sessionId/actions",
    validateBody(AppendActionsBodySchema),
    appendActions
);

router.post("/sessions/:sessionId/geo", validateBody(
  // inline zod-lite; or create schema file
  // expecting { lat:number, lon:number }
  // If you already have a validateBody util with zod, use it here.
  // @ts-ignore minimal validator
  {
    parse: (b: any) => {
      if (typeof b?.lat !== "number" || typeof b?.lon !== "number") throw new Error("Invalid");
      return b;
    }
  }
), updateGeo);

export default router;