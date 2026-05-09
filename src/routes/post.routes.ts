// src\routes\post.routes.ts
import { Router } from "express";
import { validateBody } from "../middlewares/validate.js";
import { CreatePostBodySchema } from "../schemas/post.schema.js";
import { createPostController, listPostsController, getPostController } from "../controllers/post.controller.js";

const router = Router();

router.get("/", listPostsController);
router.get("/:id", getPostController);
router.post("/", validateBody(CreatePostBodySchema), createPostController);



export default router;
