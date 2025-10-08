// src\routes\analytics.routes.ts
import {Router} from "express";
import { 
    analyticsOverview,
    analyticsGeo,
    analyticsDevices,
    analyticsActions,
    analyticsStream,
    analyticsGeoPoints
 } from "../controllers/analytics.controller";
 import { campaignsOverview, campaignDetail } from "../controllers/campaigns.controller";

 const router = Router();

 router.get("/overview", analyticsOverview);
 router.get("/geo", analyticsGeo);
 router.get("/geo/points", analyticsGeoPoints);
 router.get("/devices", analyticsDevices);
 router.get("/actions", analyticsActions);
 router.get("/stream",analyticsStream);

 router.get("/campaigns/overview", campaignsOverview);
 router.get("/campaigns/detail", campaignDetail);

 export default router;