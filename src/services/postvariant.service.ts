// src\services\postvariant.service.ts
import { PostModel } from "../models/post.model.js";
import { generateVariantsFromAnalysis } from "./ai/variant.provider.js";

export async function generatePostVariants(postId: string, count = 5) {
  const post = await PostModel.findById(postId);
  if (!post) throw new Error("Post not found");
  if (!post.analysis) throw new Error("No analysis found; analyze first");

  // Avoid regenerating duplicates
  if (post.variants?.length) return post;

  post.status = "generating";
  await post.save();

  try {
    const variants = await generateVariantsFromAnalysis(post.analysis, count);
    post.variants = variants;
    post.status = "variants_ready";
    await post.save();
    return post.toObject();
  } catch (err) {
    post.status = "failed";
    await post.save();
    throw err;
  }
}
