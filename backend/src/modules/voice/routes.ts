import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { aiOrchestratorService } from "../../services/aiOrchestratorService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { applyJarvisVoicePersona, jarvisVoicePersona } from "./jarvisVoicePersona.js";

const router = Router();
router.use(authMiddleware);

router.get("/persona", asyncHandler(async (_req, res) => {
  res.json({ persona: jarvisVoicePersona });
}));

router.post("/process", validate(z.object({ text: z.string().optional().default("") })), asyncHandler(async (req, res) => {
  const text = req.body.text.trim();
  if (!text) return res.status(400).json({ message: "Informe uma fala ou comando para o JARVIS processar." });
  const result = await aiOrchestratorService.process(req.user!.id, text);
  res.json({ ...result, reply: applyJarvisVoicePersona(result.reply), voicePersona: jarvisVoicePersona.name });
}));

export default router;
