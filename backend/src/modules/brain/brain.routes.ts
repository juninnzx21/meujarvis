import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { brainController } from "./brain.controller.js";

const router = Router();
router.use(authMiddleware);

const askSchema = z.object({
  message: z.string().min(1).max(8000),
  source: z.enum(["chat", "voice", "whatsapp", "mobile", "automation"]).default("chat"),
  mode: z.enum(["normal", "deep", "quick"]).default("normal"),
  allowExternalAI: z.boolean().default(true),
  allowTools: z.boolean().default(true)
});

router.post("/ask", validate(askSchema), asyncHandler(brainController.ask));
router.post("/plan", validate(askSchema), asyncHandler(brainController.plan));
router.post("/execute-draft", asyncHandler(brainController.executeDraft));
router.post("/feedback", validate(z.object({ message: z.string().min(1).max(2000), savePreference: z.boolean().optional() })), asyncHandler(brainController.feedback));
router.get("/feedback", asyncHandler(brainController.listFeedback));
router.get("/agents", asyncHandler(brainController.agents));
router.get("/tools", asyncHandler(brainController.tools));
router.get("/status", asyncHandler(brainController.status));

export default router;
