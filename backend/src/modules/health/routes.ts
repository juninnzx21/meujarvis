import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { getHealth } from "../../services/healthService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.get("/", asyncHandler(async (_req, res) => {
  const health = await getHealth(false);
  res.json({
    app: health.app,
    readiness: health.readiness,
    database: health.database,
    scheduler: {
      enabled: health.scheduler.enabled,
      running: health.scheduler.running,
      intervalSeconds: health.scheduler.intervalSeconds
    },
    uptimeSeconds: health.uptimeSeconds,
    timestamp: health.timestamp,
    version: health.version
  });
}));
router.get("/full", authMiddleware, asyncHandler(async (req, res) => res.json(await getHealth(true, req.user!.id, req.user!.role === "admin"))));
router.get("/public", asyncHandler(async (_req, res) => {
  const health = await getHealth(false);
  const schedulerStatus = health.scheduler.enabled && health.scheduler.running ? "ok" : health.scheduler.enabled ? "error" : "disabled";
  res.json({
    app: health.app,
    readiness: health.readiness,
    database: health.database,
    scheduler: schedulerStatus,
    timestamp: health.timestamp
  });
}));
export default router;
