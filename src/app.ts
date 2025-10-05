// src\app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import sessionRoutes from "./routes/session.routes";
import {env} from "./config/env";
import{notFound} from "./middlewares/notFound";
import { errorHandler } from "./middlewares/error";
import analyticsRoutes from "./routes/analytics.routes";
import variantRoutes from "./routes/variant.routes"; 

const app = express();

app.set("trust proxy",1);
app.disable("x-powered-by");

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({
    origin:env.FRONTEND_ORIGIN,
    credentials:false
}));

app.get("/api/health",(_req,res)=>{
    res.json({ok:true,service:"backend",time:new Date().toISOString()});
});

app.use("/api",sessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/variants", variantRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;