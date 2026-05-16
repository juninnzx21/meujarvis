import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { homeAssistantService } from "./homeAssistantService.js";
import { n8nService } from "./n8nService.js";
import { openAiService } from "./openAiService.js";
import { schedulerService } from "./schedulerService.js";
import { geminiService } from "./geminiService.js";
import { whatsappService } from "./whatsappService.js";
import { publicIntegrationUrls } from "./integrationConfigService.js";

export async function getHealth(full = false) {
  let database = "ok";
  let logsCount = 0;
  let recentFailures: unknown[] = [];
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (full) {
      const [count, failures] = await Promise.all([
        prisma.systemLog.count(),
        prisma.systemLog.findMany({
          where: { level: { in: ["error", "warning", "security"] } },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, level: true, module: true, action: true, message: true, createdAt: true }
        })
      ]);
      logsCount = count;
      recentFailures = failures;
    }
  } catch {
    database = "error";
  }

  const [whatsappStatus, homeAssistantStatus, pendingImports, pendingReviewRows, lastBackup] = await Promise.all([
    whatsappService.status(),
    homeAssistantService.status(),
    prisma.statementImport.count({ where: { status: { in: ["uploaded", "parsed", "review_required"] } } }),
    prisma.statementImportRow.count({ where: { status: "pending" } }),
    prisma.systemLog.findFirst({ where: { module: "backup" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
  ]);
  const base = {
    app: "ok",
    database,
    openaiConfigured: openAiService.configured,
    geminiConfigured: geminiService.configured,
    n8nConfigured: n8nService.configured,
    whatsappConfigured: whatsappStatus.configured,
    homeAssistantConfigured: homeAssistantStatus.configured,
    uptimeSeconds: Math.round(process.uptime()),
    scheduler: schedulerService.status(),
    timestamp: new Date().toISOString(),
    version: env.APP_VERSION
  };

  if (!full) return base;
  return {
    ...base,
    integrations: {
      apiPublic: { url: publicIntegrationUrls.apiPublicUrl, status: "configured" },
      n8n: { ...n8nService.status(), urlMasked: publicIntegrationUrls.n8nPublicUrl, reachable: undefined, lastTestAt: undefined },
      whatsapp: { ...whatsappStatus, webhookUrl: publicIntegrationUrls.whatsappWebhookUrl, wakePhraseRequired: true, autoReply: whatsappStatus.autoReply, lastTestAt: undefined },
      evolution: { configured: whatsappStatus.configured, reachable: undefined, instanceStatus: whatsappStatus.status },
      homeAssistant: homeAssistantStatus,
      finance: { pendingImports, pendingReviewRows, requireImportReview: true },
      backup: { lastBackupAt: lastBackup?.createdAt ?? null },
      monitoring: { publicHealthUrl: publicIntegrationUrls.publicHealthUrl },
      openai: openAiService.status()
      ,
      gemini: geminiService.status()
    },
    observability: {
      uptimeSeconds: base.uptimeSeconds,
      logsCount,
      recentFailures
    }
  };
}
