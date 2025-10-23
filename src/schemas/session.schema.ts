// src\schemas\session.schema.ts
import {z} from "zod";


//Reusable helper
const stringOrUndef = z.string().trim().min(1).max(200).optional();

//UTM shape(all optinal;present only if URL has them)
export const UtmSchema = z.object({
    utm_source:stringOrUndef,
    utm_medium:stringOrUndef,
    utm_campaign:stringOrUndef,
    utm_content:stringOrUndef,
    utm_term:stringOrUndef,
}).partial();

export const SessionStartBodySchema = z.object({
    sessionId:z.string().min(8).max(64),
    utm:UtmSchema.optional(),
    pageUrl:z.string().url().optional(),
    referrer:z.string().url().optional(),
    
});

export const SessionStartBodyExtendedSchema = SessionStartBodySchema.extend({
    variant:z
        .object({
            _id: z.string().optional(),
            name: z.string().optional(),
        })
        .optional(),

        variantId: z.string().nullable().optional(),
        variantName: z.string().nullable().optional(),
        lat: z.number().optional(),
        lon: z.number().optional(),
    });
export const UpdateGeoBodySchema = z.object({
    lat:z.number(),
    lon:z.number(),
});

export const SessionStartResponseSchema = z.object({
    ok:z.literal(true),
    session:z.object({
        sessionId:z.string(),
        location:z.string().optional().nullable(),
        device:z.string().optional().nullable(),
    }),
});

export const ErrorResponseSchema = z.object({
    ok:z.literal(false),
    error:z.string(),
    issues:z
       .array(
        z.object({
            path:z.array(z.union([z.string(),z.number()])),
            message:z.string(),
        })
       )
       .optional(),
});

export type SessionStartBody = z.infer<typeof SessionStartBodySchema>;

export type SessionStartBodyExtended = z.infer<typeof SessionStartBodyExtendedSchema>;

export const ActionEventEnum = z.enum([
    "CTA_Click",
    "SectionEnter",
    "SectionExit",
    "SectionTime",
    "Scrolled",
    "ReachedEnd",
]);

export const ActionInputSchema = z.object({
    section:z.string().trim().min(1).max(64),
    event:ActionEventEnum,
    timeSpent:z.number().nonnegative().max(36000).optional(),
    timestamp:z.string().datetime().optional(),
});

export const AppendActionsBodySchema = z.object({
    actions:z.array(ActionInputSchema).min(1).max(20),
});

export const AppendActionsResponseSchema = z.object({
    ok:z.literal(true),
    appended:z.number().int().nonnegative(),
});

export type ActionInput =z.infer<typeof ActionInputSchema>;
export type AppendActionsBody = z.infer<typeof AppendActionsBodySchema>;