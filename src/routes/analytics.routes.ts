// src\routes\analytics.routes.ts
import {Router} from "express";
import { 
    analyticsOverview,
    analyticsGeo,
    analyticsDevices,
    analyticsActions,
    analyticsStream,
 } from "../controllers/analytics.controller";

 const router = Router();

 router.get("/overview", analyticsOverview);
 router.get("/geo", analyticsGeo);
 router.get("/devices", analyticsDevices);
 router.get("/actions", analyticsActions);
 router.get("/stream",analyticsStream);

 export default router;