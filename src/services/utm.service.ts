// src\services\utm.service.ts
import { randomBytes } from "node:crypto";
import { UtmMap } from "../models/utm.model.js";
import { PostModel } from "../models/post.model.js";
import { FacebookIntegration } from "../models/fb.integration.model.js";

function makeSlug() {
  return randomBytes(4).toString("hex"); // 8-char short id
}

export async function createUtmMapping(input: {
  baseLandingUrl: string;   // e.g., https://aenigm3labs.com/
  postId: string;
  variantId: string;
  platform: "facebook";
  pageId: string;
}) {
  const post = await PostModel.findById(input.postId).lean();
  if (!post || Array.isArray(post)) throw new Error("Post not found");
  const fb = await FacebookIntegration.findOne({ "pages.pageId": input.pageId }).lean();
  if (!fb) throw new Error("Facebook page not connected");

  const url = new URL(input.baseLandingUrl);
  url.searchParams.set("utm_source", input.platform);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", String(post._id));
  url.searchParams.set("utm_content", input.variantId);
  url.searchParams.set("utm_id", `${input.pageId}`); // helps map to page

  const slug = makeSlug();
  const doc = await UtmMap.create({
    slug,
    targetUrl: url.toString(),
    platform: input.platform,
    pageId: input.pageId,
    postId: post._id,
    variantId: input.variantId
  });

  return doc.toObject();
}
