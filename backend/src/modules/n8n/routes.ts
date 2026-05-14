import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { n8nService } from "../../services/n8nService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/status", (_req, res) => res.json(n8nService.status()));
router.post("/trigger", asyncHandler(async (req, res) => res.json(await n8nService.trigger(req.body, req.user!.id))));
router.post("/test", asyncHandler(async (req, res) => res.json(await n8nService.test(req.user!.id))));

export default router;
