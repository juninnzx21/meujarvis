import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { aiOrchestratorService } from "../../services/aiOrchestratorService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.post("/process", validate(z.object({ text: z.string().min(1) })), asyncHandler(async (req, res) => {
  const result = await aiOrchestratorService.process(req.user!.id, req.body.text);
  res.json(result);
}));

export default router;
