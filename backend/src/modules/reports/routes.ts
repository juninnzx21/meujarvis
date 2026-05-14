import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { buildActivityReport, buildDailySummary, buildSystemReport, buildTaskReport } from "../../services/reportService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/daily-summary", asyncHandler(async (req, res) => res.json(await buildDailySummary(req.user!.id))));
router.get("/tasks", asyncHandler(async (req, res) => res.json(await buildTaskReport(req.user!.id))));
router.get("/system", asyncHandler(async (req, res) => res.json(await buildSystemReport(req.user!.id))));
router.get("/activity", asyncHandler(async (req, res) => res.json(await buildActivityReport(req.user!.id))));

export default router;
