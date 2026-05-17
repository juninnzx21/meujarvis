import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { brainService } from "../brain/brain.service.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/conversations", asyncHandler(async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  res.json({ conversations });
}));

router.get("/conversations/:id", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: req.user!.id },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  });
  if (!conversation) return res.status(404).json({ message: "Conversa nao encontrada" });
  return res.json({ conversation });
}));

router.delete("/conversations/:id", asyncHandler(async (req, res) => {
  await prisma.conversation.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  res.status(204).send();
}));

router.post("/send", validate(z.object({ content: z.string().min(1), conversationId: z.string().optional(), mode: z.enum(["quick", "normal", "deep"]).optional() })), asyncHandler(async (req, res) => {
  const { content, conversationId, mode } = req.body;
  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: req.user!.id } })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId: req.user!.id, title: content.slice(0, 48) || "Nova conversa" }
    });
  }

  const userMessage = await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content } });
  const result = await brainService.ask({ userId: req.user!.id, message: content, source: "chat", mode: mode ?? "normal", allowExternalAI: true, allowTools: true });
  const assistantMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: result.reply, metadata: { intent: result.intent, agent: result.agent, confidence: result.confidence, needsConfirmation: result.needsConfirmation } }
  });
  res.json({ conversation, userMessage, assistantMessage, reply: result.reply, intent: result.intent, agent: result.agent, confidence: result.confidence, usedSources: result.usedSources, usedTools: result.usedTools, needsConfirmation: result.needsConfirmation, draftAction: result.draftAction, suggestedNextActions: result.suggestedNextActions });
}));

router.post("/stream", validate(z.object({ content: z.string().min(1), conversationId: z.string().optional(), mode: z.enum(["quick", "normal", "deep"]).optional() })), asyncHandler(async (req, res) => {
  const { content, conversationId, mode } = req.body;
  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: req.user!.id } })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId: req.user!.id, title: content.slice(0, 48) || "Nova conversa" }
    });
  }

  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content } });
  const result = await brainService.ask({ userId: req.user!.id, message: content, source: "chat", mode: mode ?? "normal", allowExternalAI: true, allowTools: true });
  const assistantMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: result.reply, metadata: { intent: result.intent, agent: result.agent, streamingFallback: true } }
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`event: metadata\ndata: ${JSON.stringify({ conversationId: conversation.id, messageId: assistantMessage.id, intent: result.intent, agent: result.agent })}\n\n`);
  res.write(`event: token\ndata: ${JSON.stringify({ content: result.reply })}\n\n`);
  res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  res.end();
}));

export default router;
