// src\routes\session.routes.ts
import {Router} from "express";
import {startSession,appendActions} from "../controllers/session.controller";
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

export default router;