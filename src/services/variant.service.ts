// src\services\variant.service.ts

/*
Job this file
1.Mannual variant CRUD operations
2.Variant assignment logic for sessions
3.Variant analytics overview
4.Variant pinned option
*/

import mongoose from "mongoose";
import { Variant } from "../models/variant.model.js";
import { Session } from "../models/session.model.js";
import type {
  CreateVariantBody,
  UpdateVariantBody,
  AssignVariantBody,
} from "../schemas/variant.schema.js";

// CREATE
export async function createVariantService(body: CreateVariantBody) {
  const v = await Variant.create(body);
  return v.toObject();
}

// LIST
export async function listVariantsService() {
  return Variant.find()
    .sort({ pinned: -1, active: -1, createdAt: -1 })
    .lean();
}

// UPDATE (pin/unpin, toggle, edit)
export async function updateVariantService(id: string, body: UpdateVariantBody) {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("InvalidId");
  }

  // if pinning this variant, unpin others
  if (body.pinned === true) {
    await Variant.updateMany(
      { _id: { $ne: id } },
      { $set: { pinned: false } }
    );
  }

  const updated = await Variant.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true }
  ).lean();

  if (!updated) {
    throw new Error("NotFound");
  }

  return updated;
}

// DELETE
export async function deleteVariantService(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("InvalidId");
  }

  const del = await Variant.findByIdAndDelete(id).lean();
  if (!del) {
    throw new Error("NotFound");
  }

  return true;
}

// ASSIGN (choose variant for a visit + increment impressions)
export async function assignVariantService(data: AssignVariantBody) {
  const { sessionId, forceId, forceName } = data;

  let chosen: any = null;

  // 1) If marketer forces a variant (preview), honor it even if over cap
  if (forceId || forceName) {
    const filter: any = forceId
      ? { _id: new mongoose.Types.ObjectId(forceId) }
      : { name: forceName };

    const found = await Variant.findOne(filter).lean();
    if (found) {
      chosen = await Variant.findByIdAndUpdate(
        found._id,
        { $inc: { impressions: 1 } },
        { new: true }
      ).lean();
    }
  }

  // 2) Else pinned variant (if active)
  if (!chosen) {
    chosen = await Variant.findOneAndUpdate(
      { pinned: true, active: true },
      { $inc: { impressions: 1 } },
      { new: true }
    ).lean();
  }

  // 3) Else random eligible (active + under showCap)
  if (!chosen) {
    const candidate = await Variant.aggregate([
      {
        $match: {
          active: true,
          $expr: { $lt: ["$impressions", "$showCap"] },
        },
      },
      { $sample: { size: 1 } },
    ]);
    if (candidate[0]?._id) {
      chosen = await Variant.findByIdAndUpdate(
        candidate[0]._id,
        { $inc: { impressions: 1 } },
        { new: true }
      ).lean();
    }
  }

  // Attach chosen variant -> Session (for analytics)
  await Session.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        variantId: chosen?._id ?? null,
        variantName: chosen?.name ?? null,
      },
    },
    { upsert: true, new: true }
  );

  // Shape into the response structure expected by VariantResponseSchema
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

  return responseVariant;
}

// ------- VARIANT ANALYTICS (overview) -------

export async function variantsOverviewService() {
  // First: aggregate sessions grouped by variantId
  const rows = await Session.aggregate([
    {
      $addFields: {
        heroTime: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$actions",
                  as: "a",
                  cond: {
                    $and: [
                      { $eq: ["$$a.event", "SectionTime"] },
                      { $eq: ["$$a.section", "hero"] },
                    ],
                  },
                },
              },
              as: "aa",
              in: { $ifNull: ["$$aa.timeSpent", 0] },
            },
          },
        },
        servicesTime: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$actions",
                  as: "a",
                  cond: {
                    $and: [
                      { $eq: ["$$a.event", "SectionTime"] },
                      { $eq: ["$$a.section", "services"] },
                    ],
                  },
                },
              },
              as: "aa",
              in: { $ifNull: ["$$aa.timeSpent", 0] },
            },
          },
        },
        contactTime: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$actions",
                  as: "a",
                  cond: {
                    $and: [
                      { $eq: ["$$a.event", "SectionTime"] },
                      { $eq: ["$$a.section", "contact"] },
                    ],
                  },
                },
              },
              as: "aa",
              in: { $ifNull: ["$$aa.timeSpent", 0] },
            },
          },
        },
        clicks: {
          $size: {
            $filter: {
              input: "$actions",
              as: "a",
              cond: { $eq: ["$$a.event", "CTA_Click"] },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: "$variantId",
        variantName: { $first: "$variantName" },
        sessions: { $sum: 1 },
        ips: { $addToSet: { $ifNull: ["$ip", ""] } },
        clicks: { $sum: "$clicks" },
        heroTime: { $sum: "$heroTime" },
        servicesTime: { $sum: "$servicesTime" },
        contactTime: { $sum: "$contactTime" },
      },
    },
    {
      $project: {
        _id: 0,
        variantId: "$_id",
        variantName: 1,
        sessions: 1,
        users: { $size: "$ips" },
        clicks: 1,
        ctr: {
          $cond: [
            { $gt: ["$sessions", 0] },
            { $divide: ["$clicks", "$sessions"] },
            0,
          ],
        },
        avgHero: {
          $cond: [
            { $gt: ["$sessions", 0] },
            { $divide: ["$heroTime", "$sessions"] },
            0,
          ],
        },
        avgServices: {
          $cond: [
            { $gt: ["$sessions", 0] },
            { $divide: ["$servicesTime", "$sessions"] },
            0,
          ],
        },
        avgContact: {
          $cond: [
            { $gt: ["$sessions", 0] },
            { $divide: ["$contactTime", "$sessions"] },
            0,
          ],
        },
      },
    },
    { $sort: { sessions: -1 } },
  ]);

  // Then: load variant docs so we can join metadata (impressions, cap, active, pinned)
  const variants = await Variant.find().lean();
  const byId = new Map(variants.map((v) => [String(v._id), v]));

  const merged = rows.map((r: any) => {
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

  return merged;
}
