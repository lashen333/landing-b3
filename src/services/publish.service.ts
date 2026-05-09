// src\services\publish.service.ts
import { PostModel, type PostDoc, type PostVariant } from "../models/post.model.js";
import { FacebookIntegration, type FacebookIntegrationDoc } from "../models/fb.integration.model.js";
import { createUtmMapping } from "./utm.service.js"; // already built
import { Posting } from "../models/posting.model.js";
import { fbCreateLinkPost, fbCreatePhotoPost } from "./providers/facebook.graph.js";
import { env } from "../config/env.js";



export async function publishToFacebook(input: {
  postId: string;
  variantId: string;
  pageId: string;
  mode?: "link" | "photo"; // link shares UTM, photo uploads image with caption including UTM
}) {
  const post = await PostModel.findById(input.postId).lean<PostDoc>().exec();
  
  if (!post) throw new Error("Post not found");
  if (!post.variants?.length) throw new Error("No variants on post");
  
  const variant = post.variants.find((v: PostVariant) => v.variantId === input.variantId);
  if (!variant) throw new Error("Variant not found");

  const fb = await FacebookIntegration.findOne({ "pages.pageId": input.pageId }).lean<FacebookIntegrationDoc>().exec();
  if (!fb) throw new Error("Facebook page not connected");

  const page = fb.pages.find(p => p.pageId === input.pageId)!;
  if (!page) throw new Error("Page token not found for that pageId");

  // 1) secretly mint UTM for this (post, variant, page)
  const map = await createUtmMapping({
    baseLandingUrl: env.BASE_LANDING_URL!,
    postId: String(post._id),
    variantId: input.variantId,
    platform: "facebook",
    pageId: input.pageId
  });

  // 2) create a Posting record (queued → publishing)
  const posting = await Posting.create({
    platform: "facebook",
    pageId: input.pageId,
    postId: post._id,
    variantId: input.variantId,
    utmSlug: map.slug,
    utmId: map._id,
    status: "publishing",
  });

  try {
    // 3) build message/caption
    const headline = variant.headline ?? "";
    const caption  = variant.caption ?? "";
    const cta      = variant.cta ? ` — ${variant.cta}` : "";
    const shortUrl = `${process.env.DASHBOARD_URL}/l/${map.slug}`;

    const mode = input.mode ?? "link";

    let fbResp: any;
    if (mode === "photo") {
      // Photo post uses the image URL from Supabase and caption includes link
      fbResp = await fbCreatePhotoPost(input.pageId, page.pageToken, {
        imageUrl: post.url,
        caption: `${headline}\n\n${caption}${cta}\n\n${shortUrl}`
      });
    } else {
      // Link post lets FB render link preview; message above the link
      fbResp = await fbCreateLinkPost(input.pageId, page.pageToken, {
        message: `${headline}\n\n${caption}${cta}`,
        link: shortUrl
      });
    }

    await Posting.findByIdAndUpdate(posting._id, {
      status: "published",
      fbPostId: fbResp?.post_id || fbResp?.id || null
    });

    return {
      ok: true,
      fbPostId: fbResp?.post_id || fbResp?.id || null,
      shareUrl: shortUrl,            // what was posted
      targetUrl: map.targetUrl,      // full UTM (still secret in UI)
    };
  } catch (err: any) {
    await Posting.findByIdAndUpdate(posting._id, {
      status: "failed",
      error: err.message ?? String(err)
    });
    throw err;
  }
}
