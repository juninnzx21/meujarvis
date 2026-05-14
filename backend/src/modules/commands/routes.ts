import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { commands, runCommand } from "../../services/commandService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/", (_req, res) => res.json({ commands }));
router.post("/run", validate(z.object({ phrase: z.string().min(2) })), asyncHandler(async (req, res) => {
  res.json(await runCommand(req.user!.id, req.body.phrase));
}));

export default router;
