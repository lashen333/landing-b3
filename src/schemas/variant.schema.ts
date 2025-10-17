// src\schemas\variant.schema.ts
import { z } from "zod";

// Accept http(s) URLs, /relative, or #anchor
const ctaHrefRelaxed = z
  .string()
  .trim()
  .min(1, "ctaHref cannot be empty")
  .refine(
    (v) =>
      /^https?:\/\//i.test(v) || v.startsWith("/") || v.startsWith("#"),
    { message: "Invalid URL: use http(s)://, /path, or #anchor" }
  );

// If you also want to allow empty or missing, wrap with optional/nullable later
const ctaHrefOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v)) // treat empty string as missing
  .pipe(z.union([ctaHrefRelaxed, z.undefined()]));

export const CreateVariantBodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  heroTitle: z.string().trim().min(2).max(120),
  heroSub: z.string().trim().min(2).max(200),
  ctaText: z.string().trim().min(1).max(60).optional(),
  ctaHref: ctaHrefOptional, // changed
  showCap: z.coerce.number().int().nonnegative().max(1_000_000).optional(), // coerce
});

export const UpdateVariantBodySchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  heroTitle: z.string().trim().min(2).max(120).optional(),
  heroSub: z.string().trim().min(2).max(200).optional(),
  ctaText: z.string().trim().min(1).max(60).optional(),
  ctaHref: ctaHrefOptional, // changed
  active: z.boolean().optional(),
  pinned: z.boolean().optional(),
  showCap: z.coerce.number().int().nonnegative().max(1_000_000).optional(), // coerce
});

export const AssignVariantBodySchema = z.object({
  sessionId: z.string().min(8).max(64),
  forceId: z.string().optional(),
  forceName: z.string().trim().min(1).max(60).optional(),
});

// If your DB may not always have ctaText/ctaHref, mark them optional here too
export const VariantResponseSchema = z.object({
  ok: z.literal(true),
  variant: z.object({
    _id: z.string(),
    name: z.string(),
    heroTitle: z.string(),
    heroSub: z.string(),
    ctaText: z.string().optional(), // changed
    ctaHref: z.string().optional(), // changed
    active: z.boolean(),
    pinned: z.boolean(),
    showCap: z.number().optional(), // if not always set
    impressions: z.number().optional(), // if not always set on create
  }).nullable(),
});

export type CreateVariantBody = z.infer<typeof CreateVariantBodySchema>;
export type UpdateVariantBody = z.infer<typeof UpdateVariantBodySchema>;
export type AssignVariantBody = z.infer<typeof AssignVariantBodySchema>;
