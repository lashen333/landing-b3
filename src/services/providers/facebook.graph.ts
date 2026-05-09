// src\services\providers\facebook.graph.ts
import fetch from "node-fetch";
const FB_GRAPH = "https://graph.facebook.com/v19.0";

type FbError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type FbFeedPostResponse = FbError & {
  id?: string; // "<pageId>_<postId>"
};

type FbPhotoPostResponse = FbError & {
  id?: string;        // "<photoId>"
  post_id?: string;   // "<pageId>_<postId>"
};

export async function fbCreateLinkPost(
  pageId: string,
  pageToken: string,
  params: { message: string; link: string }
) {
  const url = `${FB_GRAPH}/${pageId}/feed`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      message: params.message,
      link: params.link,
      access_token: pageToken,
    }),
  });

  const j = (await r.json()) as FbFeedPostResponse;
  if (!r.ok) throw new Error(j?.error?.message || "FB feed post failed");
  return j; // { id: "<pageId>_<postId>" }
}

export async function fbCreatePhotoPost(
  pageId: string,
  pageToken: string,
  params: { caption: string; imageUrl: string }
) {
  const url = `${FB_GRAPH}/${pageId}/photos`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      caption: params.caption,
      url: params.imageUrl,
      access_token: pageToken,
    }),
  });

  const j = (await r.json()) as FbPhotoPostResponse;
  if (!r.ok) throw new Error(j?.error?.message || "FB photo post failed");
  return j; // { id, post_id }
}
