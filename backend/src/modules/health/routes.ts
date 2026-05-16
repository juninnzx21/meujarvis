import { Router } from "express";
import { getHealth } from "../../services/healthService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.get("/", asyncHandler(async (_req, res) => res.json(await getHealth(false))));
router.get("/full", asyncHandler(async (_req, res) => res.json(await getHealth(true))));
router.get("/public", asyncHandler(async (_req, res) => {
  const health = await getHealth(false);
  const schedulerStatus = health.scheduler.enabled && health.scheduler.running ? "ok" : health.scheduler.enabled ? "error" : "disabled";
  res.json({
    app: health.app,
    database: health.database,
    scheduler: schedulerStatus,
    timestamp: health.timestamp
  });
}));
export default router;
