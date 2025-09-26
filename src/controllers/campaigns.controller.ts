// src\controllers\campaigns.controller.ts
import type { Request, Response } from "express";
import { Session } from "../models/session.model";

// Helpers to compute section sums inside $addFields
const sectionSumExpr = (section: string) => ({
  $sum: {
    $map: {
      input: {
        $filter: {
          input: "$actions",
          as: "a",
          cond: { $and: [
            { $eq: ["$$a.event", "SectionTime"] },
            { $eq: ["$$a.section", section] }
          ] }
        }
      },
      as: "aa",
      in: { $ifNull: ["$$aa.timeSpent", 0] }
    }
  }
});

const totalTimeExpr = {
  $sum: {
    $map: {
      input: {
        $filter: {
          input: "$actions",
          as: "a",
          cond: { $eq: ["$$a.event", "SectionTime"] }
        }
      },
      as: "aa",
      in: { $ifNull: ["$$aa.timeSpent", 0] }
    }
  }
};

const ctaClicksExpr = {
  $size: {
    $filter: {
      input: "$actions",
      as: "a",
      cond: { $eq: ["$$a.event", "CTA_Click"] }
    }
  }
};

// ---------- OVERVIEW: grouped by source + campaign ----------
export async function campaignsOverview(_req: Request, res: Response) {
  const rows = await Session.aggregate([
    { $addFields: {
        heroTime: sectionSumExpr("hero"),
        servicesTime: sectionSumExpr("services"),
        contactTime: sectionSumExpr("contact"),
        totalTime: totalTimeExpr,
        ctaClicks: ctaClicksExpr,
        source: { $ifNull: ["$utm_source", "direct"] },
        campaign: { $ifNull: ["$utm_campaign", "(none)"] }
    }},
    { $group: {
        _id: { source: "$source", campaign: "$campaign" },
        sessions: { $sum: 1 },
        ips: { $addToSet: { $ifNull: ["$ip", ""] } },
        ctaClicks: { $sum: "$ctaClicks" },
        heroTime: { $sum: "$heroTime" },
        servicesTime: { $sum: "$servicesTime" },
        contactTime: { $sum: "$contactTime" },
        totalTime: { $sum: "$totalTime" },
    }},
    { $project: {
        _id: 0,
        source: "$_id.source",
        campaign: "$_id.campaign",
        sessions: 1,
        users: { $size: "$ips" }, // unique by IP
        ctaClicks: 1,
        ctr: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$ctaClicks", "$sessions"] }, 0] },
        avgTimePerSession: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$totalTime", "$sessions"] }, 0] },
        avgHero: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$heroTime", "$sessions"] }, 0] },
        avgServices: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$servicesTime", "$sessions"] }, 0] },
        avgContact: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$contactTime", "$sessions"] }, 0] },
    }},
    { $sort: { sessions: -1, ctaClicks: -1 } }
  ]);

  // Aggregate also by platform (source) for a quick chart
  const bySource = await Session.aggregate([
    { $addFields: {
        source: { $ifNull: ["$utm_source", "direct"] },
        clicks: ctaClicksExpr
    }},
    { $group: {
        _id: "$source",
        sessions: { $sum: 1 },
        ips: { $addToSet: { $ifNull: ["$ip", ""] } },
        ctaClicks: { $sum: "$clicks" }
    }},
    { $project: {
        _id: 0,
        source: "$_id",
        sessions: 1,
        users: { $size: "$ips" },
        ctaClicks: 1,
        ctr: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$ctaClicks", "$sessions"] }, 0] }
    }},
    { $sort: { sessions: -1 } }
  ]);

  return res.json({ ok: true, rows, bySource });
}

// ---------- DETAIL: one campaign (source + campaign) ----------
export async function campaignDetail(req: Request, res: Response) {
  const sourceQ = (req.query.source as string) ?? "direct";
  const campaignQ = (req.query.campaign as string) ?? "(none)";

  const [head] = await Session.aggregate([
    { $addFields: {
        heroTime: sectionSumExpr("hero"),
        servicesTime: sectionSumExpr("services"),
        contactTime: sectionSumExpr("contact"),
        totalTime: totalTimeExpr,
        clicks: ctaClicksExpr,
        source: { $ifNull: ["$utm_source", "direct"] },
        campaign: { $ifNull: ["$utm_campaign", "(none)"] }
    }},
    { $match: { source: sourceQ, campaign: campaignQ } },
    { $group: {
        _id: null,
        sessions: { $sum: 1 },
        ips: { $addToSet: { $ifNull: ["$ip", ""] } },
        clicks: { $sum: "$clicks" },
        totalTime: { $sum: "$totalTime" },
        heroTime: { $sum: "$heroTime" },
        servicesTime: { $sum: "$servicesTime" },
        contactTime: { $sum: "$contactTime" },
    }},
    { $project: {
        _id: 0,
        source: sourceQ,
        campaign: campaignQ,
        sessions: 1,
        users: { $size: "$ips" },
        ctaClicks: "$clicks",
        ctr: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$clicks", "$sessions"] }, 0] },
        avgTimePerSession: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$totalTime", "$sessions"] }, 0] },
        avgHero: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$heroTime", "$sessions"] }, 0] },
        avgServices: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$servicesTime", "$sessions"] }, 0] },
        avgContact: { $cond: [{ $gt: ["$sessions", 0] }, { $divide: ["$contactTime", "$sessions"] }, 0] },
    }},
  ]);

  // device breakdown for this campaign
  const devices = await Session.aggregate([
    { $addFields: {
        source: { $ifNull: ["$utm_source", "direct"] },
        campaign: { $ifNull: ["$utm_campaign", "(none)"] },
        device2: { $ifNull: ["$device", "unknown"] }
    }},
    { $match: { source: sourceQ, campaign: campaignQ } },
    { $group: { _id: "$device2", count: { $sum: 1 } } },
    { $project: { _id: 0, label: "$_id", count: 1 } },
    { $sort: { count: -1 } }
  ]);

  // top geo for this campaign
  const geo = await Session.aggregate([
    { $addFields: {
        source: { $ifNull: ["$utm_source", "direct"] },
        campaign: { $ifNull: ["$utm_campaign", "(none)"] },
        loc: { $ifNull: ["$location", "Unknown"] }
    }},
    { $match: { source: sourceQ, campaign: campaignQ } },
    { $group: { _id: "$loc", sessions: { $sum: 1 }, ips: { $addToSet: { $ifNull: ["$ip", ""] } } } },
    { $project: { _id: 0, location: "$_id", sessions: 1, uniqueUsers: { $size: "$ips" } } },
    { $sort: { sessions: -1 } },
    { $limit: 20 }
  ]);

  return res.json({ ok: true, head: head ?? null, devices, geo });
}
