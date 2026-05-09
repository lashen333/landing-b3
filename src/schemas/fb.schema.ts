// src\schemas\fb.schema.ts
import { z } from "zod";

/** Standard Facebook error envelope */
export const FbErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string(),
    code: z.number(),
    error_subcode: z.number().optional(),
    fbtrace_id: z.string().optional(),
  }),
});

/** /oauth/access_token success shape (short/long-lived) */
export const FbTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(), // seconds
});

/** union: success OR error */
export const FbTokenOrErrorSchema = z.union([FbTokenSchema, FbErrorSchema]);

/** /me */
export const FbMeSchema = z.object({
  id: z.string(),
  name: z.string(),
});

/** /me/accounts pages list */
export const FbPagesSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string().optional(),
      access_token: z.string(),
      picture: z
        .object({
          data: z
            .object({
              url: z.string().url().optional(),
              is_silhouette: z.boolean().optional(),
            })
            .partial(),
        })
        .partial()
        .optional(),
    })
  ),
  paging: z
    .object({
      cursors: z.object({
        before: z.string().optional(),
        after: z.string().optional(),
      }),
    })
    .partial()
    .optional(),
});

export type FbToken = z.infer<typeof FbTokenSchema>;
export type FbMe = z.infer<typeof FbMeSchema>;
export type FbPages = z.infer<typeof FbPagesSchema>;
export type FbPage = FbPages["data"][number];
