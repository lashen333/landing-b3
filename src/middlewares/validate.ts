import type { NextFunction, Request, Response } from "express";
import { z, type ZodIssue, type ZodTypeAny } from "zod";
import { ErrorResponseSchema } from "../schemas/session.schema.js";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      // ✅ parsed.error.issues (not "isssues")
      const issues = parsed.error.issues.map((i: ZodIssue) => ({
        path: i.path as (string | number)[], // Zod path is (string|number)[]
        message: i.message,
      }));

      const payload = { ok: false as const, error: "ValidationError", issues };

      // Validate our error shape before sending
      const safe = ErrorResponseSchema.parse(payload);
      return res.status(400).json(safe);
    }

    // Use the parsed/sanitized data
    req.body = parsed.data;
    next();
  };
}

export function sendValidated<T extends z.ZodTypeAny>(
  res: Response,
  schema: T,
  payload: unknown,
  status = 200
) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error("Response schema validation failed:", parsed.error);
    return res.status(500).json({ ok: false, error: "InternalResponseShapeError" });
  }
  return res.status(status).json(parsed.data);
}
