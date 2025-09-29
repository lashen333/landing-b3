import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
    console.log("Health check OK");
  res.status(200).send("OK");
});
router.get("/test", (_req, res) => {
    console.log("Test endpoint OK");
  res.json({
    ok: true,
    service: "backend",
    time: new Date().toISOString(),
  });
});
export default router;