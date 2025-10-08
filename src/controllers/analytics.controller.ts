// src\controllers\analytics.controller.ts
import type {Request, Response} from "express";
import {Session} from "../models/session.model";

const MIN = 60*1000;

function nowMinus(ms: number){
    return new Date(Date.now() - ms);
}

//Count CTA clicks
async function getCTAClicks(){
    const res = await Session.aggregate([
        {$unwind:"$actions"},
        {$match:{"actions.event":"CTA_Click"}},
        {$count:"count"},
    ]);
    return res[0]?.count ?? 0;
}

//Average time by section
async function getAvgTimeBySection(){
    const res = await Session.aggregate([
        {$unwind:"$actions"},
        {$match:{"actions.event":"SectionTime"}},
        {$group:{
            _id:"$actions.section",
            total:{$sum:{$ifNull:["$actions.timeSpent",0]}},
            n:{$sum:1}
        }},
        {$project:{section:"$_id", avgSeconds:{$divide:["$total","$n"]},_id:0}},
        {$sort:{section:1}}
    ]);
    return res;
}

//Breakdown by a field
async function getBreakdown(field:"device" | "utm_source"){
    const res = await Session.aggregate([
        {$group:{
            _id:{$ifNull:[`$${field}`,field === "utm_source" ? "direct" : "unknown"]},
            count:{$sum:1}
        }},
        {$project:{label:"$_id", count: 1,_id: 0}},
        {$sort:{count: -1}}
    ]);
    return res;
}

//Location
async function getTopGeo(limit = 10){
    const res = await Session.aggregate([
        {$group:{
            _id:{$ifNull:["$location","Unknown"]},
            count:{$sum:1}
        }},
        {$project:{location:"$_id",count: 1,_id: 0}},
        {$sort:{count:-1}},
        {$limit:limit}
    ]);
    return res;
}

//api endpoint overview
export async function analyticsOverview(_req: Request, res: Response) {
  const [totalSessions, distinctIps, activeDistinctIps, ctaClicks,
    avgTimeBySection, deviceBreakdown, sourceBreakdown, geoTop] = await Promise.all([
      Session.estimatedDocumentCount(),
      Session.distinct("ip"),
      Session.distinct("ip", { updatedAt: { $gte: nowMinus(30 * MIN) } }),
      getCTAClicks(),
      getAvgTimeBySection(),
      getBreakdown("device"),
      getBreakdown("utm_source"),
      getTopGeo(10),
  ]);

  return res.json({
    ok: true,
    updatedAt: new Date().toISOString(),
    totals: {
      sessions: totalSessions,
      uniqueUsers: distinctIps.filter(Boolean).length,        // unique by IP
      activeUsers30m: activeDistinctIps.filter(Boolean).length,
      ctaClicks,
    },
    charts: {
      avgTimeBySection,   // [{section, avgSeconds}]
      deviceBreakdown,    // [{label, count}]
      sourceBreakdown,    // [{label, count}]
      geoTop,             // [{location, count}]
    }
  });
}

//api endpoint geo
export async function analyticsGeo(_req: Request, res: Response) {
  const full = await Session.aggregate([
    { $group: {
        _id: { $ifNull: ["$location", "Unknown"] },
        sessions: { $sum: 1 },
        uniqueIps: { $addToSet: { $ifNull: ["$ip", ""] } }
    }},
    { $project: { location: "$_id", sessions: 1, uniqueUsers: { $size: "$uniqueIps" }, _id: 0 } },
    { $sort: { sessions: -1 } }
  ]);
  return res.json({ ok: true, geo: full });
}

//api endpoint devices
export async function analyticsDevices(_req: Request, res: Response) {
  const list = await getBreakdown("device");
  return res.json({ ok: true, devices: list });
}

//api endpoint actions
export async function analyticsActions(_req: Request, res: Response) {
  // last 50 actions across sessions
  const list = await Session.aggregate([
    { $unwind: "$actions" },
    { $sort: { "actions.timestamp": -1 } },
    { $limit: 50 },//last 50 actions only show
    { $project: {
        sessionId: 1,
        section: "$actions.section",
        event: "$actions.event",
        timeSpent: "$actions.timeSpent",
        timestamp: "$actions.timestamp",
        _id: 0
    }}
  ]);
  return res.json({ ok: true, actions: list });
}

export async function analyticsStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let alive = true;
  req.on("close", () => { alive = false;});

    // Initial snapshot
  const sendSnapshot = async () => {
    const snapshot = await fetchOverviewMinimal();
    if (!alive) return;
    res.write(`event: overview\n`);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    if (!alive) return;
    res.write(`event: ping\ndata: {}\n\n`);
  }, 15000);

  // Try change streams
  let changeStream: any;
  try {
    changeStream = Session.watch([], { fullDocument: "updateLookup" });
    changeStream.on("change", () => { void sendSnapshot(); });
  } catch {
    // If change streams not available (e.g., local/permissions), we’ll poll
    const poller = setInterval(() => { void sendSnapshot(); }, 5000);
    req.on("close", () => clearInterval(poller));
  }
    req.on("close", () => {
    clearInterval(heartbeat);
    changeStream?.close?.();
  });

  // kick off
  void sendSnapshot();
}
async function fetchOverviewMinimal() {
  const [totalSessions, distinctIps, activeDistinctIps, ctaClicks] = await Promise.all([
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
    }
  };
}
export async function analyticsGeoPoints(_req: Request, res: Response) {
  const points = await Session.aggregate([
    { $match: { lat: { $type: "number" }, lon: { $type: "number" } } },
    { $group: {
        _id: { country: "$country", city: "$city", lat: "$lat", lon: "$lon" },
        sessions: { $sum: 1 },
        ips: { $addToSet: { $ifNull: ["$ip", ""] } }
    }},
    { $project: {
        _id: 0,
        country: "$_id.country",
        city: "$_id.city",
        lat: "$_id.lat",
        lon: "$_id.lon",
        sessions: 1,
        users: { $size: "$ips" }
    }},
    { $sort: { sessions: -1 } }
  ]);
  return res.json({ ok: true, points });
}





