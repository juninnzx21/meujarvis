import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { brainService } from "../brain/brain.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { applyJarvisVoicePersona, jarvisVoicePersona } from "./jarvisVoicePersona.js";
import { ttsService } from "../../services/ttsService.js";
import { prisma } from "../../prisma/client.js";

const router = Router();
router.use(authMiddleware);

router.get("/persona", asyncHandler(async (_req, res) => {
  res.json({ persona: jarvisVoicePersona });
}));

router.get("/tts/status", asyncHandler(async (req, res) => {
  res.json(await ttsService.status(req.user!.id));
}));

router.post("/speech", validate(z.object({ text: z.string().min(1).max(5000) })), asyncHandler(async (req, res) => {
  try {
    const result = await ttsService.synthesize(req.user!.id, req.body.text);
    if (result.status === "browser") return res.status(204).end();
    res.set({ "Content-Type": "audio/mpeg", "Content-Length": String(result.audio.length), "Cache-Control": "no-store", "X-Jarvis-TTS-Provider": result.provider });
    return res.status(200).send(result.audio);
  } catch (error) {
    const message = error instanceof Error && !error.message.includes("Request failed") ? error.message : "O provedor de voz não concluiu a síntese. Verifique a chave, a voz e os créditos da conta.";
    return res.status(502).json({ message });
  }
}));

router.post("/process", validate(z.object({ text: z.string().trim().min(1).max(8000), conversationId: z.string().optional() })), asyncHandler(async (req, res) => {
  const { text, conversationId } = req.body;
  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: req.user!.id } })
    : null;
  if (!conversation) conversation = await prisma.conversation.create({ data: { userId: req.user!.id, title: text.slice(0, 48) || "Conversa por voz" } });

  const history = await prisma.message.findMany({ where: { conversationId: conversation.id, role: { in: ["user", "assistant"] } }, orderBy: { createdAt: "desc" }, take: 12, select: { role: true, content: true } });
  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: text } });
  const result = await brainService.ask({ userId: req.user!.id, message: text, source: "voice", mode: "normal", allowExternalAI: true, allowTools: true, history: history.reverse().map((item) => ({ role: item.role as "user" | "assistant", content: item.content })) });
  const reply = applyJarvisVoicePersona(result.reply);
  const answer = applyJarvisVoicePersona(result.answer);
  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply, metadata: { source: "voice", intent: result.intent, agent: result.agent, usedSources: result.usedSources } } });
  res.json({ ...result, reply, answer, conversationId: conversation.id, voicePersona: jarvisVoicePersona.name });
}));

export default router;
