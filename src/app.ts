// src\app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import sessionRoutes from "./routes/session.routes.js";
import {env} from "./config/env.js";
import{notFound} from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/error.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import variantRoutes from "./routes/variant.routes.js"; 
import postRoutes from "./routes/post.routes.js";
import postAnalyzeRoutes from "./routes/post.analyze.routes.js";
import postvariantRoutes from "./routes/post.variant.routes.js";
import fbintegrationRoutes from "./routes/fb.integration.routes.js";
import utmRoutes from "./routes/utm.routes.js";
import publishRoutes from "./routes/publish.routes.js";

const app = express();

app.set("trust proxy",1);
app.disable("x-powered-by");

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({
    origin:env.FRONTEND_ORIGIN,
    credentials:true
}));

app.get("/api/health",(_req,res)=>{
    res.json({ok:true,service:"backend",time:new Date().toISOString()});
});

app.use("/api",sessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/variants", variantRoutes);

app.use("/api/posts", postRoutes);
app.use("/api/posts", postAnalyzeRoutes);
app.use("/api/posts", postvariantRoutes);

app.use("/api/integrations", fbintegrationRoutes);
app.use("/api/utm", utmRoutes);
app.use("/api/publish", publishRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;