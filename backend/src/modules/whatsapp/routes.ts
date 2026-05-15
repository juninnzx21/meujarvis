import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { aiOrchestratorService } from "../../services/aiOrchestratorService.js";
import { whatsappService } from "../../services/whatsappService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

const configSchema = z.object({
  apiUrl: z.string().url("Informe a URL da Evolution API.").transform((value) => value.replace(/\/+$/, "")),
  apiKey: z.string().optional(),
  instance: z.string().min(1, "Informe a instancia."),
  autoReply: z.boolean().default(false)
});

router.get("/status", authMiddleware, asyncHandler(async (req, res) => res.json(await whatsappService.status(req.user!.id))));
router.get("/config", authMiddleware, asyncHandler(async (req, res) => res.json(await whatsappService.getConfig(req.user!.id))));
router.put("/config", authMiddleware, validate(configSchema), asyncHandler(async (req, res) => {
  res.json(await whatsappService.saveConfig(req.user!.id, req.body));
}));
router.delete("/config", authMiddleware, asyncHandler(async (req, res) => {
  res.json(await whatsappService.clearConfig(req.user!.id));
}));
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
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (admin) {
    const config = await whatsappService.runtimeConfig(admin.id);
    if (config.autoReply && content && !fromJarvis && !isGroup) {
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
