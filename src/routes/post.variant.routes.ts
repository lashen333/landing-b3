// src\routes\post.variant.routes.ts
import { Router } from "express";
import { z } from "zod";
import { generateVariantsController } from "../controllers/post.variant.controller.js";

const router = Router();

const ParamsSchema = z.object({ id: z.string().min(10) });
const BodySchema = z.object({ count: z.number().min(1).max(10).optional() }).optional();

router.post("/:id/variants/generate", async (req, res, next) => {
  try {
    req.params = ParamsSchema.parse(req.params);
    if (req.body && Object.keys(req.body).length) req.body = BodySchema.parse(req.body);
    next();
  } catch (e) { return res.status(400).json({ ok:false, error:(e as any).message }); }
}, generateVariantsController);

export default router;
