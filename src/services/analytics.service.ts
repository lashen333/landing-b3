// src\services\analytics.service.ts

/*
Job this file
1.talks to the MongoDB
2.Implement analytics business logic
3.return plain JS objects/arrays
*/
 
import { Session } from "../models/session.model.js";

const MIN = 60 * 1000;

function nowMinus(ms: number) {
  return new Date(Date.now() - ms);
}

// Count CTA clicks
export async function getCTAClicks() {
  const res = await Session.aggregate([
    { $unwind: "$actions" },
    { $match: { "actions.event": "CTA_Click" } },
    { $count: "count" },
  ]);
  return res[0]?.count ?? 0;
}

// Average time by section
export async function getAvgTimeBySection() {
  const res = await Session.aggregate([
    { $unwind: "$actions" },
    { $match: { "actions.event": "SectionTime" } },
    {
      $group: {
        _id: "$actions.section",
        total: { $sum: { $ifNull: ["$actions.timeSpent", 0] } },
        n: { $sum: 1 },
      },
    },
    {
      $project: {
        section: "$_id",
        avgSeconds: { $divide: ["$total", "$n"] },
        _id: 0,
      },
    },
    { $sort: { section: 1 } },
  ]);
  return res;
}

// Generic breakdown by field
export async function getBreakdown(field: "device" | "utm_source") {
  const res = await Session.aggregate([
    {
      $group: {
        _id: {
          $ifNull: [
            `$${field}`,
            field === "utm_source" ? "direct" : "unknown",
          ],
        },
        count: { $sum: 1 },
      },
    },
    { $project: { label: "$_id", count: 1, _id: 0 } },
    { $sort: { count: -1 } },
  ]);
  return res;
}

// Location summary (top N locations)
export async function getTopGeo(limit = 10) {
  const res = await Session.aggregate([
    {
      $group: {
        _id: { $ifNull: ["$location", "Unknown"] },
        count: { $sum: 1 },
      },
    },
    { $project: { location: "$_id", count: 1, _id: 0 } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return res;
}

// Full geo summary table
export async function getGeoOverview() {
  const res = await Session.aggregate([
    {
      $group: {
        _id: { $ifNull: ["$location", "Unknown"] },
        sessions: { $sum: 1 },
        uniqueIps: { $addToSet: { $ifNull: ["$ip", ""] } },
      },
    },
    {
      $project: {
        location: "$_id",
        sessions: 1,
        uniqueUsers: { $size: "$uniqueIps" },
        _id: 0,
      },
    },
    { $sort: { sessions: -1 } },
  ]);
  return res;
}

// Last N actions across sessions
export async function getLatestActions(limit = 50) {
  const res = await Session.aggregate([
    { $unwind: "$actions" },
    { $sort: { "actions.timestamp": -1 } },
    { $limit: limit },
    {
      $project: {
        sessionId: 1,
        section: "$actions.section",
        event: "$actions.event",
        timeSpent: "$actions.timeSpent",
        timestamp: "$actions.timestamp",
        _id: 0,
      },
    },
  ]);
  return res;
}

// Geo points with lat/lon (for map)
export async function getGeoPoints() {
  const res = await Session.aggregate([
    { $match: { lat: { $type: "number" }, lon: { $type: "number" } } },
    {
      $group: {
        _id: {
          country: "$country",
          city: "$city",
          lat: "$lat",
          lon: "$lon",
        },
        sessions: { $sum: 1 },
        ips: { $addToSet: { $ifNull: ["$ip", ""] } },
      },
    },
    {
      $project: {
        _id: 0,
        country: "$_id.country",
        city: "$_id.city",
        lat: "$_id.lat",
        lon: "$_id.lon",
        sessions: 1,
        users: { $size: "$ips" },
      },
    },
    { $sort: { sessions: -1 } },
  ]);
  return res;
}

// Full overview (for /overview endpoint)
export async function fetchOverview() {
  const [
    totalSessions,
    distinctIps,
    activeDistinctIps,
    ctaClicks,
    avgTimeBySection,
    deviceBreakdown,
    sourceBreakdown,
    geoTop,
  ] = await Promise.all([
    Session.estimatedDocumentCount(),
    Session.distinct("ip"),
    Session.distinct("ip", { updatedAt: { $gte: nowMinus(30 * MIN) } }),
    getCTAClicks(),
    getAvgTimeBySection(),
    getBreakdown("device"),
    getBreakdown("utm_source"),
    getTopGeo(10),
  ]);

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    totals: {
      sessions: totalSessions,
      uniqueUsers: distinctIps.filter(Boolean).length,
      activeUsers30m: activeDistinctIps.filter(Boolean).length,
      ctaClicks,
    },
    charts: {
      avgTimeBySection,
      deviceBreakdown,
      sourceBreakdown,
      geoTop,
    },
  };
}

// Minimal overview (for SSE stream)
export async function fetchOverviewMinimal() {
  const [totalSessions, distinctIps, activeDistinctIps, ctaClicks] =
    await Promise.all([
      Session.estimatedDocumentCount(),
      Session.distinct("ip"),
      Session.distinct("ip", { updatedAt: { $gte: nowMinus(30 * MIN) } }),
      getCTAClicks(),
    ]);

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    totals: {
      sessions: totalSessions,
      uniqueUsers: distinctIps.filter(Boolean).length,
      activeUsers30m: activeDistinctIps.filter(Boolean).length,
      ctaClicks,
    },
  };
}
