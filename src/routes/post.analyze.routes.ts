// src\routes\post.analyze.routes.ts

import { Router } from "express";
import { validateBody, validateParams } from "../middlewares/validate.js";
import {
  AnalyzePostParamsSchema,
  AnalyzePostBodySchema
} from "../schemas/post.analyze.schema.js";
import { analyzePostController } from "../controllers/post.analyze.controller.js";

const router = Router();

router.post(
  "/:id/analyze",
  validateParams(AnalyzePostParamsSchema),
  validateBody(AnalyzePostBodySchema),
  analyzePostController
);

export default router;
