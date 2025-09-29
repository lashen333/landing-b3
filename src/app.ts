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
import router from "./routes/healthRoute";

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

// LOG EVERY REQUEST
app.use((req, _res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

app.use("/api",sessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/", router);

app.use(notFound);
app.use(errorHandler);

export default app;