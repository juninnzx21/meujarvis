import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { homeAssistantService } from "./homeAssistantService.js";
import { n8nService } from "./n8nService.js";
import { openAiService } from "./openAiService.js";
import { schedulerService } from "./schedulerService.js";
import { geminiService } from "./geminiService.js";
import { whatsappService } from "./whatsappService.js";
import { publicIntegrationUrls } from "./integrationConfigService.js";
import { httpMetrics } from "../utils/httpMetrics.js";
import type { HttpMetricsSnapshot } from "../utils/httpMetrics.js";
import { redactSensitive } from "../utils/redact.js";
import { sanitizeSystemLog } from "./systemLogService.js";

interface HealthBase {
  app: string;
  readiness: string;
  database: string;
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  n8nConfigured: boolean | null;
  whatsappConfigured: boolean | null;
  homeAssistantConfigured: boolean | null;
  uptimeSeconds: number;
  scheduler: ReturnType<typeof schedulerService.status>;
  timestamp: string;
  version: string;
}

interface IntegrationHealth {
  configured?: boolean | null;
  status?: string;
  connectivity?: string;
  [key: string]: unknown;
}

interface FullHealth extends HealthBase {
  integrations: {
    whatsapp: IntegrationHealth;
    homeAssistant: IntegrationHealth;
    [key: string]: unknown;
  };
  observability: {
    uptimeSeconds: number;
    logsCount: number | null;
    recentFailures: unknown[];
    queryStatus: string;
    http: HttpMetricsSnapshot | null;
  };
}

async function safelyReadStatus<T>(read: () => Promise<T> | T): Promise<T | undefined> {
  try {
    return await read();
  } catch {
    return undefined;
  }
}

export function getHealth(full: true, userId?: string): Promise<FullHealth>;
export function getHealth(full?: false, userId?: string): Promise<HealthBase>;
export function getHealth(full: true, userId: string | undefined, includeSystemWideData: boolean): Promise<FullHealth>;
export async function getHealth(full = false, userId?: string, includeSystemWideData = false): Promise<HealthBase | FullHealth> {
  let database = "ok";
  let logsCount: number | null = full ? 0 : null;
  let recentFailures: unknown[] = [];
  let pendingImports: number | null = full ? 0 : null;
  let pendingReviewRows: number | null = full ? 0 : null;
  let lastBackupAt: Date | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (full) {
      const ownerLogFilter = includeSystemWideData ? {} : { userId: userId ?? "__unowned__" };
      const ownerImportFilter = includeSystemWideData ? {} : { userId: userId ?? "__unowned__" };
      const [count, failures, imports, reviewRows, lastBackup] = await Promise.all([
        prisma.systemLog.count({ where: ownerLogFilter }),
        prisma.systemLog.findMany({
          where: { ...ownerLogFilter, level: { in: ["error", "warning", "security"] } },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, level: true, module: true, action: true, message: true, createdAt: true }
        }),
        prisma.statementImport.count({ where: { ...ownerImportFilter, status: { in: ["uploaded", "parsed", "review_required"] } } }),
        prisma.statementImportRow.count({ where: { status: "pending", ...(includeSystemWideData ? {} : { import: { is: { userId: userId ?? "__unowned__" } } }) } }),
        includeSystemWideData
          ? prisma.systemLog.findFirst({ where: { module: "backup" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
          : Promise.resolve(null)
      ]);
      logsCount = count;
      recentFailures = failures.map((failure) => sanitizeSystemLog({ ...failure, message: redactSensitive(failure.message) }));
      pendingImports = imports;
      pendingReviewRows = reviewRows;
      lastBackupAt = lastBackup?.createdAt ?? null;
    }
  } catch {
    database = "error";
    logsCount = full ? null : logsCount;
    recentFailures = [];
    pendingImports = full ? null : pendingImports;
    pendingReviewRows = full ? null : pendingReviewRows;
    lastBackupAt = null;
  }

  const [whatsappResult, homeAssistantResult, n8nResult, openAiResult, geminiResult] = await Promise.all([
    safelyReadStatus<IntegrationHealth>(() => full && !includeSystemWideData && userId
      ? whatsappService.healthStatusForUser(userId)
      : whatsappService.status(userId, includeSystemWideData)),
    safelyReadStatus<IntegrationHealth>(() => full && !includeSystemWideData && userId
      ? homeAssistantService.healthStatusForUser(userId)
      : homeAssistantService.status(userId, includeSystemWideData)),
    safelyReadStatus<IntegrationHealth>(() => full && !includeSystemWideData && userId
      ? n8nService.healthStatusForUser(userId)
      : userId ? n8nService.userStatus(userId, includeSystemWideData) : full ? { configured: null, status: "unknown" } : n8nService.status()),
    safelyReadStatus<IntegrationHealth>(() => includeSystemWideData || !full
      ? openAiService.status()
      : userId ? openAiService.healthStatusForUser(userId) : { configured: null, status: "unknown" }),
    safelyReadStatus<IntegrationHealth>(() => includeSystemWideData || !full
      ? geminiService.status()
      : userId ? geminiService.healthStatusForUser(userId) : { configured: null, status: "unknown" })
  ]);
  const whatsappStatus = whatsappResult ?? { configured: null, status: "unknown", autoReply: false };
  const homeAssistantStatus = homeAssistantResult ?? { configured: null, status: "unknown" };
  const n8nStatus = n8nResult ?? { configured: null, status: "unknown" };
  const schedulerStatus = schedulerService.status();
  const visibleSchedulerStatus = !includeSystemWideData
    ? { ...schedulerStatus, lastRunAt: null, lastError: null, errorCountRecent: 0 }
    : schedulerStatus;
  const base = {
    app: "ok",
    readiness: database === "ok" ? "ready" : "degraded",
    database,
    openaiConfigured: full && !includeSystemWideData ? openAiResult?.configured === true : openAiService.configured,
    geminiConfigured: full && !includeSystemWideData ? geminiResult?.configured === true : geminiService.configured,
    n8nConfigured: n8nStatus.configured ?? null,
    whatsappConfigured: whatsappStatus.configured ?? null,
    homeAssistantConfigured: homeAssistantStatus.configured ?? null,
    uptimeSeconds: Math.round(process.uptime()),
    scheduler: visibleSchedulerStatus,
    timestamp: new Date().toISOString(),
    version: env.APP_VERSION
  };

  if (!full) return base;
  const scopedIntegrationView = !includeSystemWideData;
  return {
    ...base,
    integrations: {
      ...(scopedIntegrationView ? {} : { apiPublic: { url: publicIntegrationUrls.apiPublicUrl, status: "configured", connectivity: "not_checked" } }),
      n8n: scopedIntegrationView
        ? { configured: n8nStatus.configured ?? null, status: n8nStatus.status ?? "unknown", connectivity: n8nResult ? "not_checked" : "unknown" }
        : { ...n8nStatus, urlMasked: publicIntegrationUrls.n8nPublicUrl, connectivity: n8nResult ? "not_checked" : "unknown" },
      whatsapp: scopedIntegrationView
        ? { configured: whatsappStatus.configured, status: whatsappStatus.status, connectivity: whatsappResult ? "not_checked" : "unknown" }
        : { ...whatsappStatus, webhookUrl: publicIntegrationUrls.whatsappWebhookUrl, wakePhraseRequired: true, connectivity: whatsappResult ? "not_checked" : "unknown" },
      evolution: { configured: whatsappStatus.configured, connectivity: whatsappResult ? "not_checked" : "unknown", ...(scopedIntegrationView ? {} : { instanceStatus: whatsappStatus.status }) },
      homeAssistant: { ...homeAssistantStatus, connectivity: homeAssistantResult ? "not_checked" : "unknown" },
      finance: { pendingImports, pendingReviewRows, requireImportReview: true },
      backup: { lastBackupAt },
      ...(scopedIntegrationView ? {} : { monitoring: { publicHealthUrl: publicIntegrationUrls.publicHealthUrl } }),
      openai: openAiResult ?? { configured: null, status: "unknown" },
      gemini: geminiResult ?? { configured: null, status: "unknown" }
    },
    observability: {
      uptimeSeconds: base.uptimeSeconds,
      logsCount,
      recentFailures,
      queryStatus: database === "ok" ? "ok" : "unavailable",
      http: includeSystemWideData ? httpMetrics.snapshot() : null
    }
  };
}
