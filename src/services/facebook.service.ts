// src\services\facebook.service.ts
import qs from "querystring";

import {
    FbErrorSchema,
    FbMeSchema,
    FbPagesSchema,
    FbTokenOrErrorSchema,
    FbTokenSchema,
    type FbMe,
    type FbPage,
    type FbToken,
} from "../schemas/fb.schema.js";
import { FacebookIntegration } from "../models/fb.integration.model.js";
import { env } from "../config/env.js";

const FB_OAUTH = "https://www.facebook.com/v19.0/dialog/oauth";
const FB_GRAPH = "https://graph.facebook.com/v19.0";

/**
 * Small local helper:
 * - fetch JSON
 * - throw on HTTP errors
 * - return parsed JSON (unknown) for Zod to validate
 */
async function getJson(url: string): Promise<unknown> {
    const r = await fetch(url);
    const text = await r.text();
    // HTTP-level error
    if (!r.ok) {
        throw new Error(`Facebook HTTP ${r.status}: ${text.slice(0, 400)}`);
    }
    // Parse JSON (Graph sometimes returns 200 with {error: ...})
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`Invalid JSON from Facebook: ${text.slice(0, 400)}`);
    }
}

export function getFacebookAuthUrl() {
    const params = qs.stringify({
        client_id: env.FB_APP_ID!,
        redirect_uri: env.FB_REDIRECT_URI!,
        scope: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"].join(","), // add scope pages_manage_posts
        response_type: "code",
    });
    return `${FB_OAUTH}?${params}`;
}

export async function exchangeCodeForLongLivedUserToken(code: string): Promise<FbToken> {
    try {
        // 1) short-lived user token
        const u1 =
            `${FB_GRAPH}/oauth/access_token?` +
            qs.stringify({
                client_id: env.FB_APP_ID!,
                redirect_uri: env.FB_REDIRECT_URI!,
                client_secret: env.FB_APP_SECRET!,
                code,
            });


        const j1 = await getJson(u1);
        const t1 = FbTokenOrErrorSchema.parse(j1);
        if ("error" in t1) {
            const err = FbErrorSchema.parse(t1);
            throw new Error(`Facebook token error (short-lived): ${err.error.type}(${err.error.code}) ${err.error.message}`);
        }

        // 2) exchange to long-lived user token
        const u2 =
            `${FB_GRAPH}/oauth/access_token?` +
            qs.stringify({
                grant_type: "fb_exchange_token",
                client_id: env.FB_APP_ID!,
                client_secret: env.FB_APP_SECRET!,
                fb_exchange_token: t1.access_token,
            });

        const j2 = await getJson(u2);
        const t2 = FbTokenOrErrorSchema.parse(j2);
        if ("error" in t2) {
            const err = FbErrorSchema.parse(t2);
            throw new Error(`Facebook token error (long-lived): ${err.error.type}(${err.error.code}) ${err.error.message}`);
        }

        // extra refine (ensures we only return success shape)
        return FbTokenSchema.parse(t2);
    } catch (e: any) {  //I don’t care what the real type of this is — treat it as any so I can access whatever properties I want.
        const msg = e?.message ?? String(e);
        throw new Error(`[exchangeCodeForLongLivedUserToken] ${msg}`);
    }
}

export async function fetchUserProfile(userToken: string): Promise<FbMe> {
    const url = `${FB_GRAPH}/me?fields=id,name&access_token=${userToken}`;
    const json = await getJson(url);
    return FbMeSchema.parse(json);
}

export async function fetchUserPages(userToken: string): Promise<FbPage[]> {
    const url = `${FB_GRAPH}/me/accounts?fields=id,name,category,picture{url},access_token&access_token=${userToken}`;
    const json = await getJson(url);
    const parsed = FbPagesSchema.parse(json);
    return parsed.data;
}

export async function upsertIntegration(
    user: { id: string; name: string },
    userToken: string,
    expiresIn: number,
    pages: FbPage[]
) {
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    const doc = await FacebookIntegration.findOneAndUpdate(
        { "fbUser.fbUserId": user.id },
        {
            provider: "facebook",
            fbUser: { fbUserId: user.id, name: user.name, userToken, tokenExpiresAt },
            pages: pages.map((p) => ({
                pageId: p.id,
                name: p.name,
                category: p.category,
                pictureUrl: p?.picture?.data?.url,
                pageToken: p.access_token,
            })),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return doc.toObject();
}
