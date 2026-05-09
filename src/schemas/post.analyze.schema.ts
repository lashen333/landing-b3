// src\schemas\post.analyze.schema.ts
import { z } from "zod";

export const AnalyzePostParamsSchema = z.object({
  id: z.string().min(10),
});

export const AnalyzePostBodySchema = z.object({
  // allow overriding/forcing media kind or options if you need later
  forceKind: z.enum(["image","video","text"]).optional(),
}).optional();
