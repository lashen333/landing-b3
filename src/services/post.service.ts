// src\services\post.service.ts
import { PostModel } from "../models/post.model.js";
import { analyzePost } from "./post.analyze.service.js";

export async function createPost(input: {
  supabaseId: string; url: string; filename: string; mime: string; size: number;
  title?: string; source?: string; tags?: string[];
}) {
  const exists = await PostModel.findOne({ supabaseId: input.supabaseId }).lean();
  if (exists) return exists; // idempotent

  const doc = await PostModel.create({ ...input, status: "stored" });

  // fire-and-forget analysis (no await)
  analyzePost(doc._id.toString()).catch(() => { /* swallow, status will be failed */ });

  return doc.toObject();
}
