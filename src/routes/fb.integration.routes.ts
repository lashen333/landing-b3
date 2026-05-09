// src\routes\fb.integration.routes.ts
import { Router } from "express";
import { getFbAuthUrlController, fbCallbackController, listFbPagesController } from "../controllers/facebook.controller.js";

const router = Router();
router.get("/facebook/auth-url", getFbAuthUrlController);
router.get("/facebook/callback", fbCallbackController);
router.get("/facebook/pages", listFbPagesController);
export default router;
