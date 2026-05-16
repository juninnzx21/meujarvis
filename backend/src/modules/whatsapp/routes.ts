import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { aiOrchestratorService } from "../../services/aiOrchestratorService.js";
import { financeIntegrationService } from "../../services/financeIntegrationService.js";
import { getHealth } from "../../services/healthService.js";
import { statementImportService } from "../../services/statementImportService.js";
import { whatsappService } from "../../services/whatsappService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { redactSensitive } from "../../utils/redact.js";

const router = Router();

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

const configSchema = z.object({
  apiUrl: z.string().url("Informe a URL da Evolution API.").transform((value) => value.replace(/\/+$/, "")),
  apiKey: z.string().optional().refine((value) => !value || !/^https?:\/\//i.test(value), "API key nao pode ser uma URL. Cole a chave da Evolution API."),
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
router.post("/configure-webhook", authMiddleware, asyncHandler(async (req, res) => {
  const webhookUrl = typeof req.body?.webhookUrl === "string" ? req.body.webhookUrl : "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook";
  res.json(await whatsappService.configureWebhook(req.user!.id, webhookUrl));
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
      await whatsappService.send(
        inbound.cleanPhone || inbound.phone,
        `Recebi seu extrato. Detectei ${statement.fileType.toUpperCase()}, ${statement.bankNameDetected ?? "banco em revisao"}, conta ${statement.accountDetected ?? "a confirmar"} e ${statement.totalRows} movimentacoes. Preparei uma previa segura antes de importar: /finance/import/${statement.id}/review`,
        admin.id
      );
    } else if (file.status !== "no_attachment") {
      await whatsappService.send(inbound.cleanPhone || inbound.phone, file.message ?? "Recebi o arquivo, mas nao consegui ler com seguranca. Envie OFX ou CSV.", admin.id);
    }
  }
  if (admin) {
    const config = await whatsappService.runtimeConfig(admin.id);
    if (config.autoReply && content) {
      const financeReply = await financeIntegrationService.handleWhatsAppText(admin.id, content);
      if (financeReply) {
        await whatsappService.send(inbound.cleanPhone || inbound.phone, financeReply, admin.id);
      } else {
        const localReply = await getLocalWhatsAppReply(content);
        const response: { reply: string } = localReply
          ? { reply: localReply }
          : await withTimeout<{ reply: string }>(
            aiOrchestratorService.process(admin.id, content).then((response) => ({ reply: response.reply })),
            8000,
            { reply: "Recebi seu comando, mas a IA demorou para responder. Tente de novo em instantes ou use um comando direto como status do sistema." }
          );
        await whatsappService.send(inbound.cleanPhone || inbound.phone, response.reply, admin.id);
      }
    } else if (inbound.hasAudio && !content) {
      await whatsappService.send(inbound.cleanPhone || inbound.phone, "Recebi seu audio, mas nao consegui transcrever agora. Pode me enviar em texto?", admin.id);
    }
  }
  res.json({ received: true, processedText: Boolean(content), statementImportId: statementImportId || undefined, transcriptionStatus: transcriptionStatus || undefined });
}));

router.get("/messages", authMiddleware, asyncHandler(async (req, res) => {
  const messages = await prisma.whatsAppMessage.findMany({ where: { OR: [{ userId: req.user!.id }, { userId: null }] }, orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ messages });
}));

export default router;
