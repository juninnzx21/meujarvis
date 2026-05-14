import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { aiOrchestratorService } from "../../services/aiOrchestratorService.js";
import { whatsappService } from "../../services/whatsappService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/status", authMiddleware, (_req, res) => res.json(whatsappService.status()));
router.post("/test-connection", authMiddleware, asyncHandler(async (req, res) => res.json(await whatsappService.testConnection(req.user!.id))));
router.post("/send", authMiddleware, validate(z.object({ phone: z.string().regex(/^\d{10,15}$/, "Numero deve conter apenas digitos, com DDI."), content: z.string().min(1), confirmed: z.boolean().optional() })), asyncHandler(async (req, res) => {
  if (!req.body.confirmed) return res.status(409).json({ message: "Envio de WhatsApp exige confirmacao." });
  res.json(await whatsappService.send(req.body.phone, req.body.content, req.user!.id));
}));

router.post("/webhook", asyncHandler(async (req, res) => {
  const phone = String(req.body?.data?.key?.remoteJid ?? req.body?.phone ?? "desconhecido");
  const content = String(req.body?.data?.message?.conversation ?? req.body?.content ?? "");
  await prisma.whatsAppMessage.create({ data: { phone, content, direction: "inbound", status: "received", rawPayload: req.body } });
  const fromJarvis = Boolean(req.body?.jarvisAutoReply || req.body?.data?.key?.fromMe);
  const isGroup = phone.includes("@g.us");
  if (env.WHATSAPP_AUTO_REPLY && content && !fromJarvis && !isGroup) {
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (admin) {
      const response = await aiOrchestratorService.process(admin.id, content);
      await whatsappService.send(phone, response.reply, admin.id);
    }
  }
  res.json({ received: true });
}));

router.get("/messages", authMiddleware, asyncHandler(async (req, res) => {
  const messages = await prisma.whatsAppMessage.findMany({ where: { OR: [{ userId: req.user!.id }, { userId: null }] }, orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ messages });
}));

export default router;
