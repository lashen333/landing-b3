// src\schemas\post.schema.ts
import { z } from "zod";

export const CreatePostBodySchema = z.object({
    supabaseId: z.string().min(3),
    url: z.string().url(),
    filename: z.string().min(1),
    mime: z.string().min(1),
    size: z.number().positive().max(25*1024*1024),
    title: z.string().trim().max(160).optional(),
    source: z.enum(["manual", "facebook", "tiktok"]).default("manual").optional(),
    tags: z.array(z.string().trim().min(1)).max(10).optional(),
});

export  type CreatePostBody = z.infer<typeof CreatePostBodySchema>; //z.infer typescript helper automatically generate typescript type for the schema