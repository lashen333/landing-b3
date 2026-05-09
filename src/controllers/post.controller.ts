// src\controllers\post.controller.ts
import { Request, Response } from "express";
import { PostModel } from "../models/post.model.js";
import { createPost } from "../services/post.service.js";

export async function createPostController(req: Request, res: Response) {
  const post = await createPost(req.body);
  res.status(201).json({ ok: true, data: post });
}

export async function listPostsController(_req: Request, res: Response) {
  const data = await PostModel.find().sort({ createdAt: -1 }).limit(50).lean();
  res.json({ ok: true, data });
}

export async function getPostController(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = await PostModel.findById(id).lean();
  if (!data) return res.status(404).json({ ok:false, error: "Not found" });
  res.json({ ok: true, data });
}
