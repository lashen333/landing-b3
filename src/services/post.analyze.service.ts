// src\services\post.analyze.service.ts
import { PostModel } from "../models/post.model.js";
import { runOcrFromUrl } from "./ocr.service.js";
import { analyzePostText } from "./ai/openai.provider.js";

export async function analyzePost(
  postId: string,
  opts?: { forceKind?: "image" | "video" | "text" }
) {
  const post = await PostModel.findById(postId);
  if (!post) throw new Error("Post not found");

  // if already done, just return
  if (post.status === "ready" && post.analysis) {
    return post.toObject();
  }

  post.status = "analyzing";
  await post.save();

  try {
    const mime = post.mime.toLowerCase();
    const kind: "image" | "video" | "text" =
      opts?.forceKind ??
      (mime.startsWith("image/")
        ? "image"
        : mime.startsWith("video/")
        ? "video"
        : "text");

    if (kind === "video") {
      throw new Error("Video analyzer not implemented yet");
    }

    // --- OCR step (free) ---
    let ocrText = "";
    if (kind === "image") {
      ocrText = await runOcrFromUrl(post.url);
    } else if (kind === "text") {
      // In future you can support text uploads separately.
      throw new Error("Direct text analyzer not implemented yet");
    }

    if (!ocrText || ocrText.trim().length === 0) {
      ocrText = "(no readable text found in image)";
    }

    // --- GPT text analysis (cheap) ---
    const ai = await analyzePostText(ocrText);

    post.analysis = {
      kind,                          // "image" logically, even though we used OCR+text
      summary: ai.summary,
      topics: ai.topics,
      keywords: ai.keywords,
      colors: [],                    // not used now
      ocrText,                       // ★ store OCR for transparency & variants
      objects: [],                   // not used now
      sentiment: ai.sentiment,
      safety: ai.safety,
      raw: ai.raw,
      analyzedAt: new Date(),
    };

    post.status = "ready";
    await post.save();

    return post.toObject();
  } catch (err) {
    await PostModel.findByIdAndUpdate(postId, { status: "failed" });
    throw err;
  }
}
