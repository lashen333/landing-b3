// src\routes\utm.routes.ts
import { Router } from "express";
import { z } from "zod";
import { createUtmController, resolveUtmController } from "../controllers/utm.controller.js";

const router = Router();

const BodySchema = z.object({
  baseLandingUrl: z.string().url(),
  postId: z.string().min(10),
  variantId: z.string().uuid(),
  platform: z.literal("facebook"),
  pageId: z.string().min(5),
});

router.post("/", (req, res, next) => {
  try {
    req.body = BodySchema.parse(req.body);
    next();
  } catch (e:any) {
    return res.status(400).json({ ok:false, error: e.message });
  }
}, createUtmController);

router.get("/resolve/:slug", resolveUtmController);  // new route to resolve UTM slug

export default router;
