// src\routes\publish.routes.ts
import { Router } from "express";
import { z } from "zod";
import { publishFacebookController } from "../controllers/publish.controller.js";

const router = Router();

const BodySchema = z.object({
  postId: z.string().min(10),
  variantId: z.string().uuid(),
  pageId: z.string().min(5),
  mode: z.enum(["link","photo"]).optional()
});

router.post("/facebook", (req, res, next) => {
  try {
    req.body = BodySchema.parse(req.body);
    next();
  } catch (e:any) {
    return res.status(400).json({ ok:false, error: e.message });
  }
}, publishFacebookController);

export default router;
