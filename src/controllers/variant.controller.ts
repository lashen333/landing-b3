// src\controllers\variant.controller.ts
import type { Request, Response } from "express";
import { Variant } from "../models/variant.model";
import { Session } from "../models/session.model";
import { sendValidated } from "../middlewares/validate";
import { AssignVariantBody, AssignVariantBodySchema, CreateVariantBody, CreateVariantBodySchema, UpdateVariantBody, UpdateVariantBodySchema, VariantResponseSchema } from "../schemas/variant.schema";
import mongoose from "mongoose";

// CREATE
export async function createVariant(
  req: Request<unknown, unknown, CreateVariantBody>,
  res: Response
) {
  const body = CreateVariantBodySchema.parse(req.body);
  // If a pinned variant exists and this is pinned (not in body now), we’ll control via update
  const v = await Variant.create(body);
  return res.status(201).json({ ok: true, variant: v });
}

// LIST
export async function listVariants(_req: Request, res: Response) {
  const list = await Variant.find().sort({ pinned: -1, active: -1, createdAt: -1 }).lean();
  return res.json({ ok: true, variants: list });
}

// UPDATE (pin/unpin, active toggle, cap edit, content edit)
export async function updateVariant(
  req: Request<{ id: string }, unknown, UpdateVariantBody>,
  res: Response
) {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ ok:false, error:"InvalidId" });

  const body = UpdateVariantBodySchema.parse(req.body);

  // if pinning, unpin others
  if (body.pinned === true) {
    await Variant.updateMany({ _id: { $ne: id } }, { $set: { pinned: false } });
  }

  const updated = await Variant.findByIdAndUpdate(id, { $set: body }, { new: true }).lean();
  if (!updated) return res.status(404).json({ ok:false, error:"NotFound" });

  return res.json({ ok: true, variant: updated });
}

// DELETE
export async function deleteVariant(req: Request<{ id: string }>, res: Response) {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ ok:false, error:"InvalidId" });
  const del = await Variant.findByIdAndDelete(id).lean();
  if (!del) return res.status(404).json({ ok:false, error:"NotFound" });
  return res.json({ ok: true });
}

// ASSIGN (select a variant for this visit; increments impressions atomically)
export async function assignVariant(
  req: Request<unknown, unknown, AssignVariantBody>,
  res: Response
) {
  const { sessionId, forceId, forceName } = AssignVariantBodySchema.parse(req.body);

  let chosen: any = null;

  // 1) If forced, honor it (even if over cap) – marketers can preview by URL
  if (forceId || forceName) {
    const filter: any = forceId
      ? { _id: new mongoose.Types.ObjectId(forceId) }
      : { name: forceName };
    const found = await Variant.findOne(filter).lean();
    if (found) {
      chosen = await Variant.findByIdAndUpdate(found._id, { $inc: { impressions: 1 } }, { new: true }).lean();
    }
  }

  // 2) else pinned variant (if active)
  if (!chosen) {
    chosen = await Variant.findOneAndUpdate(
      { pinned: true, active: true },
      { $inc: { impressions: 1 } },
      { new: true }
    ).lean();
  }

  // 3) else RANDOM eligible (active and under cap)
  if (!chosen) {
    const candidate = await Variant.aggregate([
      { $match: { active: true, $expr: { $lt: ["$impressions", "$showCap"] } } },
      { $sample: { size: 1 } }
    ]);
    if (candidate[0]?._id) {
      chosen = await Variant.findByIdAndUpdate(candidate[0]._id, { $inc: { impressions: 1 } }, { new: true }).lean();
    }
  }

  // Attach variant (or null) to the session for analytics
  await Session.findOneAndUpdate(
    { sessionId },
    { $set: { variantId: chosen?._id ?? null, variantName: chosen?.name ?? null } },
    { upsert: true, new: true }
  );

  const responseVariant = chosen
  ? {
      _id: String(chosen._id),
      name: chosen.name,
      heroTitle: chosen.heroTitle,
      heroSub: chosen.heroSub,
      ctaText: chosen.ctaText,
      ctaHref: chosen.ctaHref,
      active: !!chosen.active,
      pinned: !!chosen.pinned,
      showCap: Number(chosen.showCap ?? 0),
      impressions: Number(chosen.impressions ?? 0),
    }
  : null;

  return sendValidated(res, VariantResponseSchema, { ok: true, variant: responseVariant }, 200);
}


// --------- ANALYTICS (overview + detail) ---------

export async function variantsOverview(_req: Request, res: Response) {
  // Join sessions by variantId to compute performance
  const rows = await Session.aggregate([
    { $addFields: {
        heroTime: {
          $sum: {
            $map: {
              input: { $filter: { input: "$actions", as: "a", cond: { $and: [ { $eq: ["$$a.event","SectionTime"] }, { $eq: ["$$a.section","hero"] } ] } } },
              as: "aa", in: { $ifNull: ["$$aa.timeSpent", 0] }
            }
          }
        },
        servicesTime: {
          $sum: {
            $map: {
              input: { $filter: { input: "$actions", as: "a", cond: { $and: [ { $eq: ["$$a.event","SectionTime"] }, { $eq: ["$$a.section","services"] } ] } } },
              as: "aa", in: { $ifNull: ["$$aa.timeSpent", 0] }
            }
          }
        },
        contactTime: {
          $sum: {
            $map: {
              input: { $filter: { input: "$actions", as: "a", cond: { $and: [ { $eq: ["$$a.event","SectionTime"] }, { $eq: ["$$a.section","contact"] } ] } } },
              as: "aa", in: { $ifNull: ["$$aa.timeSpent", 0] }
            }
          }
        },
        clicks: {
          $size: { $filter: { input: "$actions", as: "a", cond: { $eq: ["$$a.event","CTA_Click"] } } }
        }
    }},
    { $group: {
        _id: "$variantId",
        variantName: { $first: "$variantName" },
        sessions: { $sum: 1 },
        ips: { $addToSet: { $ifNull: ["$ip", ""] } },
        clicks: { $sum: "$clicks" },
        heroTime: { $sum: "$heroTime" },
        servicesTime: { $sum: "$servicesTime" },
        contactTime: { $sum: "$contactTime" },
      }
    },
    { $project: {
        _id: 0,
        variantId: "$_id",
        variantName: 1,
        sessions: 1,
        users: { $size: "$ips" },
        clicks: 1,
        ctr: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$clicks","$sessions"] }, 0] },
        avgHero: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$heroTime","$sessions"] }, 0] },
        avgServices: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$servicesTime","$sessions"] }, 0] },
        avgContact: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$contactTime","$sessions"] }, 0] },
      }
    },
    { $sort: { sessions: -1 } }
  ]);

  // Bring in variant doc (impressions, cap, active, pinned)
  const variants = await Variant.find().lean();
  const byId = new Map(variants.map(v => [String(v._id), v]));
  const merged = rows.map(r => {
    const v = byId.get(String(r.variantId));
    return {
      ...r,
      name: r.variantName ?? v?.name ?? "(unknown)",
      impressions: v?.impressions ?? 0,
      showCap: v?.showCap ?? 0,
      active: v?.active ?? false,
      pinned: v?.pinned ?? false,
    };
  });

  return res.json({ ok:true, variants: merged });
}
