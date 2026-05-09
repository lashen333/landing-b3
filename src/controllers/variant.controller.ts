// src\controllers\variant.controller.ts

/*
Job in this file
1.Req and Res handling for variant endpoints
*/

import type { Request, Response } from "express";
import { sendValidated } from "../middlewares/validate.js";
import {
  AssignVariantBodySchema,
  CreateVariantBodySchema,
  UpdateVariantBodySchema,
  VariantResponseSchema,
} from "../schemas/variant.schema.js";
import {
  createVariantService,
  listVariantsService,
  updateVariantService,
  deleteVariantService,
  assignVariantService,
  variantsOverviewService,
} from "../services/variant.service.js";

// CREATE
export async function createVariant(
  req: Request,
  res: Response
) {
  const body = CreateVariantBodySchema.parse(req.body);
  const variant = await createVariantService(body);
  return res.status(201).json({ ok: true, variant });
}

// LIST
export async function listVariants(_req: Request, res: Response) {
  const variants = await listVariantsService();
  return res.json({ ok: true, variants });
}

// UPDATE
export async function updateVariant(
  req: Request<{ id: string }>,
  res: Response
) {
  const id = req.params.id;
  const body = UpdateVariantBodySchema.parse(req.body);

  try {
    const updated = await updateVariantService(id, body);
    return res.json({ ok: true, variant: updated });
  } catch (err: any) {
    if (err.message === "InvalidId") {
      return res.status(400).json({ ok: false, error: "InvalidId" });
    }
    if (err.message === "NotFound") {
      return res.status(404).json({ ok: false, error: "NotFound" });
    }
    return res.status(500).json({ ok: false, error: "ServerError" });
  }
}

// DELETE
export async function deleteVariant(
  req: Request<{ id: string }>,
  res: Response
) {
  const id = req.params.id;
  try {
    await deleteVariantService(id);
    return res.json({ ok: true });
  } catch (err: any) {
    if (err.message === "InvalidId") {
      return res.status(400).json({ ok: false, error: "InvalidId" });
    }
    if (err.message === "NotFound") {
      return res.status(404).json({ ok: false, error: "NotFound" });
    }
    return res.status(500).json({ ok: false, error: "ServerError" });
  }
}

// ASSIGN (choose variant for session)
export async function assignVariant(
  req: Request,
  res: Response
) {
  const body = AssignVariantBodySchema.parse(req.body);
  const responseVariant = await assignVariantService(body);

  return sendValidated(
    res,
    VariantResponseSchema,
    { ok: true, variant: responseVariant },
    200
  );
}

// ANALYTICS OVERVIEW
export async function variantsOverview(_req: Request, res: Response) {
  const variants = await variantsOverviewService();
  return res.json({ ok: true, variants });
}
