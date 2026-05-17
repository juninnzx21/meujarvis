import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { brainService } from "../brain/brain.service.js";
import { prisma } from "../../prisma/client.js";
import { financeIntegrationService } from "../../services/financeIntegrationService.js";
import { getHealth } from "../../services/healthService.js";
import { statementImportService } from "../../services/statementImportService.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { whatsappService } from "../../services/whatsappService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { redactSensitive } from "../../utils/redact.js";
import { evolutionManagerService } from "./evolutionManagerService.js";

const router = Router();

function requireAdmin(req: Parameters<typeof authMiddleware>[0], res: Parameters<typeof authMiddleware>[1]) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Apenas administradores podem gerenciar a Evolution API." });
    return false;
  }
  return true;
}

async function getLocalWhatsAppReply(content: string) {
  if (/status|sa[uú]de|sistema|health/i.test(content)) {
    const health = await getHealth(false);
    return [
      "Status do JARVIS:",
      `App: ${health.app}`,
      `Banco: ${health.database}`,
      `Scheduler: ${health.scheduler.running ? "rodando" : "parado"}`,
      `OpenAI: ${health.openaiConfigured ? "configurado" : "ausente"}`,
      `Gemini: ${health.geminiConfigured ? "configurado" : "ausente"}`,
      `n8n: ${health.n8nConfigured ? "configurado" : "pendente"}`,
      `WhatsApp: ${health.whatsappConfigured ? "configurado" : "pendente"}`
    ].join("\n");
  }
  return "";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function safeSendWhatsApp(phone: string, content: string, userId?: string) {
  try {
    return await whatsappService.send(phone, content, userId);
  } catch (error) {
    const safeError = error instanceof Error
      ? { name: error.name, message: redactSensitive(error.message) }
      : { message: redactSensitive(String(error)) };
    await writeSystemLog({
      userId,
      level: "warning",
      module: "whatsapp",
      action: "webhook_reply_failed",
      message: "Falha ao enviar resposta WhatsApp sem derrubar webhook",
      metadata: safeError as never
    });
    return { status: "send_failed", message: "Resposta processada, mas nao consegui enviar pelo WhatsApp agora." };
  }
}

const configSchema = z.object({
  apiUrl: z.string().url("Informe a URL da Evolution API.").transform((value) => value.replace(/\/+$/, "")),
  apiKey: z.string().optional().refine((value) => !value || !/^https?:\/\//i.test(value), "API key nao pode ser uma URL. Cole a chave da Evolution API."),
  instance: z.string().min(1, "Informe a instancia."),
  autoReply: z.boolean().default(false)
});

const instanceSchema = z.object({
  instanceName: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, numeros, hifen ou underline.")
});

const optionalInstanceSchema = z.object({
  instanceName: z.string().min(1).max(80).optional()
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
router.post("/configure-webhook", authMiddleware, asyncHandler(async (req, res) => {
  const webhookUrl = typeof req.body?.webhookUrl === "string" ? req.body.webhookUrl : "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook";
  res.json(await evolutionManagerService.configureWebhook(req.user!.id, undefined, webhookUrl));
}));

router.get("/evolution/status", authMiddleware, asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.getSafeStatus(req.user!.id));
}));
router.get("/evolution/instances", authMiddleware, asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.listInstances(req.user!.id));
}));
router.post("/evolution/instances", authMiddleware, validate(instanceSchema), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.createInstance(req.user!.id, req.body.instanceName));
}));
router.post("/evolution/connect", authMiddleware, validate(optionalInstanceSchema), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.connectInstance(req.user!.id, req.body.instanceName));
}));
router.get("/evolution/connection-state", authMiddleware, validate(optionalInstanceSchema, "query"), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const instanceName = typeof req.query.instanceName === "string" ? req.query.instanceName : undefined;
  res.json(await evolutionManagerService.getConnectionState(req.user!.id, instanceName));
}));
router.post("/evolution/logout", authMiddleware, validate(optionalInstanceSchema), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.logoutInstance(req.user!.id, req.body.instanceName));
}));
router.post("/evolution/restart", authMiddleware, validate(optionalInstanceSchema), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.restartInstance(req.user!.id, req.body.instanceName));
}));
router.post("/evolution/configure-webhook", authMiddleware, validate(optionalInstanceSchema.extend({ webhookUrl: z.string().url().optional() })), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.configureWebhook(req.user!.id, req.body.instanceName, req.body.webhookUrl));
}));
router.post("/evolution/test-connection", authMiddleware, asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.testConnection(req.user!.id));
}));
router.post("/send", authMiddleware, validate(z.object({ phone: z.string().regex(/^\d{10,15}$/, "Numero deve conter apenas digitos, com DDI."), content: z.string().min(1), confirmed: z.boolean().optional() })), asyncHandler(async (req, res) => {
  if (!req.body.confirmed) return res.status(409).json({ message: "Envio de WhatsApp exige confirmacao." });
  res.json(await whatsappService.send(req.body.phone, req.body.content, req.user!.id));
}));

router.post("/webhook", asyncHandler(async (req, res) => {
  const inbound = whatsappService.extractInbound(req.body);
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  let content = inbound.text;
  let transcriptionStatus = "";
  let statementImportId = "";
  let wakePhraseDetected = whatsappService.hasWakePhrase(content);

  if (!content && inbound.hasAudio && !inbound.attachment.hasAttachment && admin) {
    const transcription = await whatsappService.transcribeInboundAudio(req.body, admin.id);
    content = transcription.text;
    transcriptionStatus = transcription.status;
    wakePhraseDetected = whatsappService.hasWakePhrase(content);
  }

  await prisma.whatsAppMessage.create({
    data: {
      phone: inbound.phone,
      content: content || (inbound.hasAudio ? "[audio recebido sem transcricao]" : inbound.attachment.hasAttachment ? "[arquivo recebido sem wake phrase]" : ""),
      direction: "inbound",
      status: wakePhraseDetected ? "received" : "ignored_wake_phrase_required",
      rawPayload: redactSensitive(req.body) as never
    }
  });

  if (!wakePhraseDetected || inbound.fromJarvis || inbound.isGroup) {
    res.json({ received: true, ignored: "wake_phrase_required", processedText: false, transcriptionStatus: transcriptionStatus || undefined });
    return;
  }

  content = whatsappService.stripWakePhrase(content);

  if (admin && inbound.attachment.hasAttachment) {
    const file = await whatsappService.downloadInboundAttachment(req.body, admin.id);
    if (file.status === "success") {
      const statement = await statementImportService.uploadFromWhatsApp(admin.id, {
        fileName: file.fileName,
        content: file.content,
        phone: inbound.cleanPhone,
        confirmedAccount: false
      });
      statementImportId = statement.id;
      await safeSendWhatsApp(
        inbound.cleanPhone || inbound.phone,
        `Recebi seu extrato. Detectei ${statement.fileType.toUpperCase()}, ${statement.bankNameDetected ?? "banco em revisao"}, conta ${statement.accountDetected ?? "a confirmar"} e ${statement.totalRows} movimentacoes. Preparei uma previa segura antes de importar: /finance/import/${statement.id}/review`,
        admin.id
      );
    } else if (file.status !== "no_attachment") {
      await safeSendWhatsApp(inbound.cleanPhone || inbound.phone, file.message ?? "Recebi o arquivo, mas nao consegui ler com seguranca. Envie OFX ou CSV.", admin.id);
    }
  }
  if (admin) {
    const config = await whatsappService.runtimeConfig(admin.id);
    if (config.autoReply && content) {
      const financeReply = await financeIntegrationService.handleWhatsAppText(admin.id, content);
      if (financeReply) {
        await safeSendWhatsApp(inbound.cleanPhone || inbound.phone, financeReply, admin.id);
      } else {
        const localReply = await getLocalWhatsAppReply(content);
        const response: { reply: string } = localReply
          ? { reply: localReply }
          : await withTimeout<{ reply: string }>(
            brainService.ask({ userId: admin.id, message: content, source: "whatsapp", mode: "quick", allowExternalAI: true, allowTools: true }).then((response) => ({ reply: response.reply })),
            8000,
            { reply: "Recebi seu comando, mas a IA demorou para responder. Tente de novo em instantes ou use um comando direto como status do sistema." }
          );
        await safeSendWhatsApp(inbound.cleanPhone || inbound.phone, response.reply, admin.id);
      }
    } else if (inbound.hasAudio && !content) {
      await safeSendWhatsApp(inbound.cleanPhone || inbound.phone, "Recebi seu audio, mas nao consegui transcrever agora. Pode me enviar em texto?", admin.id);
    }
  }
  res.json({ received: true, processedText: Boolean(content), statementImportId: statementImportId || undefined, transcriptionStatus: transcriptionStatus || undefined });
}));

router.get("/messages", authMiddleware, asyncHandler(async (req, res) => {
  const messages = await prisma.whatsAppMessage.findMany({ where: { OR: [{ userId: req.user!.id }, { userId: null }] }, orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ messages });
}));

export default router;
