import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { homeAssistantService } from "./homeAssistantService.js";
import { n8nService } from "./n8nService.js";
import { openAiService } from "./openAiService.js";
import { schedulerService } from "./schedulerService.js";
import { geminiService } from "./geminiService.js";
import { whatsappService } from "./whatsappService.js";

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

  const base = {
    app: "ok",
    database,
    openaiConfigured: openAiService.configured,
    geminiConfigured: geminiService.configured,
    n8nConfigured: n8nService.configured,
    whatsappConfigured: whatsappService.configured,
    homeAssistantConfigured: homeAssistantService.configured,
    uptimeSeconds: Math.round(process.uptime()),
    scheduler: schedulerService.status(),
    timestamp: new Date().toISOString(),
    version: env.APP_VERSION
  };

  if (!full) return base;
  return {
    ...base,
    integrations: {
      n8n: n8nService.status(),
      whatsapp: whatsappService.status(),
      homeAssistant: homeAssistantService.status(),
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
