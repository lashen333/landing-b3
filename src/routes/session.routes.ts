// src\routes\session.routes.ts
import {Router} from "express";
import {startSession,appendActions, updateGeo} from "../controllers/session.controller";
import { validateBody } from "../middlewares/validate";
import { SessionStartBodyExtendedSchema, AppendActionsBodySchema, UpdateGeoBodySchema } from "../schemas/session.schema";

const router =Router();
router.post(
    "/sessions/start",
    validateBody(SessionStartBodyExtendedSchema),
    startSession);

router.post(
    "/sessions/:sessionId/actions",
    validateBody(AppendActionsBodySchema),
    appendActions
);

router.post("/sessions/:sessionId/geo", 
  validateBody(UpdateGeoBodySchema),
  updateGeo
);

export default router;