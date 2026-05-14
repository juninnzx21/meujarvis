import { Router } from "express";
import { getHealth } from "../../services/healthService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.get("/", asyncHandler(async (_req, res) => res.json(await getHealth(false))));
router.get("/full", asyncHandler(async (_req, res) => res.json(await getHealth(true))));
export default router;
