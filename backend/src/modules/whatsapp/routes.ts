import { Router } from "express";
import { createHash } from "node:crypto";
import rateLimit from "express-rate-limit";
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
import { isValidWebhookSecret, validateEvolutionWebhook } from "./webhookSecurity.js";

const router = Router();
const webhookRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

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

function maskPhoneForLog(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return digits ? "****" : "";
  return `***${digits.slice(-4)}`;
}

async function loadWhatsAppConversation(userId: string, phone: string, firstMessage: string) {
  const phoneHash = createHash("sha256").update(phone.replace(/\D/g, "")).digest("hex").slice(0, 24);
  const key = `whatsapp_conversation_${phoneHash}`;
  const saved = await prisma.setting.findUnique({ where: { userId_key: { userId, key } }, select: { value: true } });
  let conversation = typeof saved?.value === "string"
    ? await prisma.conversation.findFirst({ where: { id: saved.value, userId } })
    : null;
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { userId, title: `WhatsApp: ${firstMessage.slice(0, 36)}` } });
    await prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value: conversation.id },
      create: { userId, key, value: conversation.id }
    });
  }
  const history = await prisma.message.findMany({ where: { conversationId: conversation.id, role: { in: ["user", "assistant"] } }, orderBy: { createdAt: "desc" }, take: 12, select: { role: true, content: true } });
  return { conversation, history: history.reverse().map((item) => ({ role: item.role as "user" | "assistant", content: item.content })) };
}

const configSchema = z.object({
  apiUrl: z.string().url("Informe a URL da Evolution API.").transform((value) => value.replace(/\/+$/, "")),
  apiKey: z.string().optional().refine((value) => !value || !/^https?:\/\//i.test(value), "API key nao pode ser uma URL. Cole a chave da Evolution API."),
  instance: z.string().min(1, "Informe a instancia."),
  autoReply: z.boolean().default(false),
  allowedSenders: z.array(z.string().regex(/^\d{10,15}$/, "Use apenas o numero com DDI e digitos.")).max(20).default([])
});

const instanceSchema = z.object({
  instanceName: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, numeros, hifen ou underline.")
});

const optionalInstanceSchema = z.object({
  instanceName: z.string().min(1).max(80).optional()
});

const resetInstanceSchema = optionalInstanceSchema.extend({
  confirmation: z.literal("RESETAR EVOLUTION")
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
router.delete("/evolution/instances", authMiddleware, validate(resetInstanceSchema), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.deleteInstance(req.user!.id, req.body.instanceName));
}));
router.post("/evolution/reset", authMiddleware, validate(resetInstanceSchema), asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await evolutionManagerService.resetInstance(req.user!.id, req.body.instanceName));
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

router.post("/webhook", webhookRateLimit, asyncHandler(async (req, res) => {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) return res.status(503).json({ message: "Webhook WhatsApp indisponivel." });
  const config = await whatsappService.runtimeConfig(admin.id);
  if (!isValidWebhookSecret(config.webhookSecret, req.get("x-jarvis-webhook-secret"))) {
    return res.status(401).json({ message: "Webhook WhatsApp nao autenticado." });
  }

  const inbound = whatsappService.extractInbound(req.body);
  const invalidReason = validateEvolutionWebhook({
    event: inbound.event,
    instance: inbound.instance,
    expectedInstance: config.instance,
    messageId: inbound.messageId,
    phone: inbound.cleanPhone,
    allowedSenders: config.allowedSenders,
    fromMe: inbound.fromJarvis,
    isGroup: inbound.isGroup
  });
  if (invalidReason) return res.status(403).json({ received: false, reason: invalidReason });

  let messageRecord;
  try {
    messageRecord = await prisma.whatsAppMessage.create({
      data: {
        userId: admin.id,
        externalMessageId: inbound.messageId,
        phone: inbound.phone,
        content: inbound.text,
        direction: "inbound",
        status: "processing",
        rawPayload: redactSensitive(req.body) as never
      }
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return res.json({ received: true, ignored: "duplicate_event" });
    }
    throw error;
  }

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

  await writeSystemLog({
    userId: admin?.id,
    module: "whatsapp",
    action: "webhook_received",
    message: "Webhook WhatsApp recebido",
    metadata: {
      phoneMasked: maskPhoneForLog(inbound.cleanPhone || inbound.phone),
      hasText: Boolean(content),
      hasAttachment: inbound.attachment.hasAttachment,
      hasAudio: inbound.hasAudio,
      fromMe: inbound.fromJarvis,
      isGroup: inbound.isGroup,
      wakePhraseDetected
    } as never
  });

  await prisma.whatsAppMessage.update({
    where: { id: messageRecord.id },
    data: {
      content: content || (inbound.hasAudio ? "[audio recebido sem transcricao]" : inbound.attachment.hasAttachment ? "[arquivo recebido sem wake phrase]" : ""),
      status: wakePhraseDetected ? "received" : "ignored_wake_phrase_required"
    }
  });

  if (!wakePhraseDetected || inbound.fromJarvis || inbound.isGroup) {
    await writeSystemLog({
      userId: admin?.id,
      level: "warning",
      module: "whatsapp",
      action: "webhook_ignored",
      message: !wakePhraseDetected
        ? "Webhook WhatsApp ignorado: frase ei jarvis ausente"
        : inbound.fromJarvis
          ? "Webhook WhatsApp ignorado: mensagem enviada pelo proprio numero"
          : "Webhook WhatsApp ignorado: mensagem de grupo",
      metadata: {
        phoneMasked: maskPhoneForLog(inbound.cleanPhone || inbound.phone),
        reason: !wakePhraseDetected ? "wake_phrase_required" : inbound.fromJarvis ? "from_me" : "group_message",
        hasAttachment: inbound.attachment.hasAttachment,
        hasAudio: inbound.hasAudio
      } as never
    });
    res.json({ received: true, ignored: "wake_phrase_required", processedText: false, transcriptionStatus: transcriptionStatus || undefined });
    return;
  }

  content = whatsappService.stripWakePhrase(content);
  await writeSystemLog({
    userId: admin?.id,
    module: "whatsapp",
    action: "webhook_processing",
    message: "Webhook WhatsApp processando comando com ei jarvis",
    metadata: {
      phoneMasked: maskPhoneForLog(inbound.cleanPhone || inbound.phone),
      hasAttachment: inbound.attachment.hasAttachment,
      hasAudio: inbound.hasAudio,
      contentLength: content.length
    } as never
  });

  if (admin && inbound.attachment.hasAttachment) {
    const file = await whatsappService.downloadInboundAttachment(req.body);
    if (file.status === "success") {
      const statement = await statementImportService.uploadFromWhatsApp(admin.id, {
        fileName: file.fileName,
        content: file.content,
        phone: inbound.cleanPhone,
        confirmedAccount: false
      });
      statementImportId = statement.id;
      await writeSystemLog({
        userId: admin.id,
        module: "whatsapp",
        action: "statement_preview_created",
        message: "Previa de extrato criada via WhatsApp",
        metadata: {
          statementImportId: statement.id,
          fileType: statement.fileType,
          totalRows: statement.totalRows,
          phoneMasked: maskPhoneForLog(inbound.cleanPhone || inbound.phone)
        } as never
      });
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
        const whatsappConversation = localReply ? null : await loadWhatsAppConversation(admin.id, inbound.cleanPhone || inbound.phone, content);
        if (whatsappConversation) await prisma.message.create({ data: { conversationId: whatsappConversation.conversation.id, role: "user", content } });
        const response: { reply: string; sources?: Array<{ type: string; title: string; url?: string }> } = localReply
          ? { reply: localReply, sources: [] }
          : await withTimeout<{ reply: string; sources?: Array<{ type: string; title: string; url?: string }> }>(
            brainService.ask({ userId: admin.id, message: content, source: "whatsapp", mode: "quick", allowExternalAI: true, allowTools: true, history: whatsappConversation?.history }).then((result) => ({ reply: result.reply, sources: result.usedSources })),
            50000,
            { reply: "A pesquisa ou resposta demorou mais que o limite. Tente novamente em instantes.", sources: [] }
          );
        const webSources = (response.sources ?? []).filter((source) => source.type === "web" && source.url).slice(0, 3);
        const messageWithSources = webSources.length
          ? `${response.reply}\n\nFontes consultadas:\n${webSources.map((source) => `• ${source.title}: ${source.url}`).join("\n")}`
          : response.reply;
        if (whatsappConversation) await prisma.message.create({ data: { conversationId: whatsappConversation.conversation.id, role: "assistant", content: messageWithSources, metadata: { source: "whatsapp", usedSources: webSources } } });
        await safeSendWhatsApp(inbound.cleanPhone || inbound.phone, messageWithSources, admin.id);
      }
    } else if (inbound.hasAudio && !content) {
      await safeSendWhatsApp(inbound.cleanPhone || inbound.phone, "Recebi seu audio, mas nao consegui transcrever agora. Pode me enviar em texto?", admin.id);
    } else {
      await writeSystemLog({
        userId: admin.id,
        level: "warning",
        module: "whatsapp",
        action: "auto_reply_disabled",
        message: "Comando WhatsApp recebido, mas resposta automatica esta desativada",
        metadata: {
          phoneMasked: maskPhoneForLog(inbound.cleanPhone || inbound.phone),
          processedText: Boolean(content)
        } as never
      });
    }
  }
  res.json({ received: true, processedText: Boolean(content), statementImportId: statementImportId || undefined, transcriptionStatus: transcriptionStatus || undefined });
}));

router.get("/messages", authMiddleware, asyncHandler(async (req, res) => {
  const messages = await prisma.whatsAppMessage.findMany({ where: { OR: [{ userId: req.user!.id }, { userId: null }] }, orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ messages });
}));

export default router;
