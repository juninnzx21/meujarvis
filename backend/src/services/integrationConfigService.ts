import axios from "axios";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { decryptSettingValue, encryptSettingValue, maskSecret, publicSettingValue } from "./encryptionService.js";
import { financeIntegrationService } from "./financeIntegrationService.js";
import { geminiService } from "./geminiService.js";
import { homeAssistantService } from "./homeAssistantService.js";
import { n8nService } from "./n8nService.js";
import { openAiService } from "./openAiService.js";
import { writeSystemLog } from "./systemLogService.js";
import { whatsappService } from "./whatsappService.js";
import { redactSensitive } from "../utils/redact.js";
import { emitJarvisEvent } from "./eventBusService.js";

export const publicIntegrationUrls = {
  frontendPublicUrl: "https://jarvis.juninnzxtec.com.br",
  apiPublicUrl: "https://apijarvis.juninnzxtec.com.br/api",
  whatsappWebhookUrl: "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook",
  n8nPublicUrl: "https://n8njarvis.juninnzxtec.com.br",
  publicHealthUrl: "https://apijarvis.juninnzxtec.com.br/api/health/public",
  fullHealthUrl: "https://apijarvis.juninnzxtec.com.br/api/health/full"
};

const globalKeys = {
  frontendPublicUrl: "public_frontend_url",
  apiPublicUrl: "public_api_url",
  whatsappWebhookUrl: "public_whatsapp_webhook_url",
  n8nPublicUrl: "public_n8n_url",
  backupOffsiteEnabled: "backup_offsite_enabled",
  monitoringAlertsEnabled: "monitoring_alerts_enabled"
};

export const integrationProviders = [
  "openai",
  "gemini",
  "n8n",
  "whatsapp",
  "evolution",
  "home_assistant",
  "finance",
  "monitoring",
  "backup",
  "api_public"
] as const;

export type IntegrationProvider = typeof integrationProviders[number];

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function configuredStatus(configured: boolean, degraded = false) {
  if (degraded) return "degraded";
  return configured ? "configured" : "not_configured";
}

export function sanitizeIntegrationConfig(config: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => {
    if (/(apiKey|token|secret|password|jwt|authorization|basicAuthPassword)/i.test(key)) {
      const plain = typeof value === "string" ? value : "";
      return [key, { configured: Boolean(plain), masked: plain ? maskSecret(plain) : "" }];
    }
    return [key, value];
  }));
}

export function validatePublicUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL publica invalida.");
  return url.toString().replace(/\/+$/, "");
}

export function validateWebhookUrl(value: string) {
  const normalized = validatePublicUrl(value);
  if (!/\/webhook|\/api\/whatsapp\/webhook/i.test(normalized)) throw new Error("Webhook deve apontar para uma rota de webhook.");
  return normalized;
}

export function assertNoSecretInResponse<T>(response: T): T {
  const serialized = JSON.stringify(response);
  if (/sk-proj-|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._~+/=-]+/i.test(serialized)) {
    throw new Error("Resposta segura bloqueada por conter padrao de segredo.");
  }
  return response;
}

async function settingMap(userId: string, keys: string[]) {
  const rows = await prisma.setting.findMany({ where: { userId, key: { in: keys } } });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

async function globalUrls(userId: string) {
  const settings = await settingMap(userId, Object.values(globalKeys));
  return {
    frontendPublicUrl: asString(settings[globalKeys.frontendPublicUrl]) || publicIntegrationUrls.frontendPublicUrl,
    apiPublicUrl: asString(settings[globalKeys.apiPublicUrl]) || publicIntegrationUrls.apiPublicUrl,
    whatsappWebhookUrl: asString(settings[globalKeys.whatsappWebhookUrl]) || publicIntegrationUrls.whatsappWebhookUrl,
    n8nPublicUrl: asString(settings[globalKeys.n8nPublicUrl]) || publicIntegrationUrls.n8nPublicUrl,
    publicHealthUrl: publicIntegrationUrls.publicHealthUrl,
    fullHealthUrl: publicIntegrationUrls.fullHealthUrl
  };
}

export async function listLocalN8nWorkflows() {
  const dir = join(process.cwd(), "..", "n8n", "workflows");
  const files = await readdir(dir);
  return files.filter((file) => file.endsWith(".json")).sort().map((file) => ({
    name: file,
    template: file.replace(/^jarvis-/, "").replace(/\.json$/, "").replace(/-/g, "."),
    path: `n8n/workflows/${file}`
  }));
}

export const integrationConfigService = {
  async status(userId: string) {
    const urls = await globalUrls(userId);
    const [n8n, whatsapp, finance, homeAssistant, pendingImports, pendingRows, lastBackup] = await Promise.all([
      n8nService.userStatus(userId),
      whatsappService.status(userId),
      financeIntegrationService.status(userId),
      homeAssistantService.status(userId),
      prisma.statementImport.count({ where: { userId, status: { in: ["uploaded", "parsed", "review_required"] } } }),
      prisma.statementImportRow.count({ where: { import: { userId }, status: "pending" } }),
      prisma.systemLog.findFirst({ where: { module: "backup" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
    ]);
    const data = {
      urls,
      providers: {
        api_public: { status: "configured", configured: true, url: urls.apiPublicUrl, webhookUrl: urls.whatsappWebhookUrl },
        openai: openAiService.status(),
        gemini: geminiService.status(),
        n8n: { ...n8n, publicUrl: urls.n8nPublicUrl },
        whatsapp: { ...whatsapp, webhookUrl: urls.whatsappWebhookUrl, wakePhraseRequired: true, wakePhrase: "ei jarvis", ignoreGroups: true },
        evolution: { ...whatsapp, webhookUrl: urls.whatsappWebhookUrl },
        home_assistant: homeAssistant,
        finance: { ...finance, pendingImports, pendingReviewRows: pendingRows, requireImportReview: true, externalAiCategorization: false },
        monitoring: { configured: true, status: "configured", publicHealthUrl: urls.publicHealthUrl, fullHealthUrl: urls.fullHealthUrl, alertsConfigured: false },
        backup: { configured: true, status: "configured", localConfigured: true, offsiteConfigured: false, lastBackupAt: lastBackup?.createdAt ?? null }
      }
    };
    return assertNoSecretInResponse(data);
  },
  async config(userId: string) {
    const status = await this.status(userId);
    return status;
  },
  async saveProvider(userId: string, provider: IntegrationProvider, input: Record<string, unknown>) {
    if (provider === "api_public") {
      const entries = [
        [globalKeys.frontendPublicUrl, validatePublicUrl(asString(input.frontendPublicUrl) || publicIntegrationUrls.frontendPublicUrl)],
        [globalKeys.apiPublicUrl, validatePublicUrl(asString(input.apiPublicUrl) || publicIntegrationUrls.apiPublicUrl)],
        [globalKeys.whatsappWebhookUrl, validateWebhookUrl(asString(input.whatsappWebhookUrl) || publicIntegrationUrls.whatsappWebhookUrl)],
        [globalKeys.n8nPublicUrl, validatePublicUrl(asString(input.n8nPublicUrl) || publicIntegrationUrls.n8nPublicUrl)]
      ] as const;
      await Promise.all(entries.map(([key, value]) => prisma.setting.upsert({
        where: { userId_key: { userId, key } },
        update: { value },
        create: { userId, key, value }
      })));
      await writeSystemLog({ userId, module: "integrations", action: "api_public_save", message: "URLs publicas atualizadas", metadata: { keys: entries.map(([key]) => key) } });
      return this.status(userId);
    }
    if (provider === "n8n") {
      return n8nService.saveConfig(userId, {
        webhookUrl: asString(input.webhookUrl || input.url || input.publicUrl),
        apiKey: asString(input.apiKey || input.token),
        webhookSecret: asString(input.webhookSecret || input.secret),
        enabled: typeof input.enabled === "boolean" ? input.enabled : true
      });
    }
    if (provider === "whatsapp" || provider === "evolution") {
      return whatsappService.saveConfig(userId, {
        apiUrl: asString(input.apiUrl),
        apiKey: asString(input.apiKey),
        instance: asString(input.instance),
        autoReply: Boolean(input.autoReply)
      });
    }
    if (provider === "home_assistant") {
      return homeAssistantService.saveConfig(userId, {
        url: asString(input.url),
        token: asString(input.token)
      });
    }
    if (provider === "finance") {
      return financeIntegrationService.saveConfig(userId, {
        apiUrl: asString(input.apiUrl),
        token: asString(input.token),
        defaultAccountName: asString(input.defaultAccountName),
        defaultAccountId: asString(input.defaultAccountId)
      });
    }
    if (provider === "monitoring" || provider === "backup") {
      const key = provider === "monitoring" ? globalKeys.monitoringAlertsEnabled : globalKeys.backupOffsiteEnabled;
      await prisma.setting.upsert({
        where: { userId_key: { userId, key } },
        update: { value: Boolean(input.enabled) },
        create: { userId, key, value: Boolean(input.enabled) }
      });
      return this.status(userId);
    }
    return { status: "manual_action_required", message: "Essa integracao usa variaveis de ambiente no backend. Configure pelo .env/secret manager e valide pelo health." };
  },
  async testProvider(userId: string, provider: IntegrationProvider) {
    if (provider === "openai") return openAiService.status();
    if (provider === "gemini") return geminiService.status();
    if (provider === "n8n") return n8nService.test(userId);
    if (provider === "whatsapp" || provider === "evolution") return whatsappService.testConnection(userId);
    if (provider === "home_assistant") return homeAssistantService.testConnection(userId);
    if (provider === "finance") return financeIntegrationService.testConnection(userId);
    if (provider === "api_public" || provider === "monitoring") {
      const urls = await globalUrls(userId);
      const response = await axios.get(`${urls.apiPublicUrl}/health`, { timeout: 15000 });
      return { status: response.status === 200 ? "success" : "error", httpStatus: response.status };
    }
    if (provider === "backup") return { status: "manual_action_required", message: "Use backup-jarvis.ps1 para executar backup local seguro." };
    return { status: "not_configured" };
  },
  async bootstrapProvider(userId: string, provider: IntegrationProvider) {
    if (provider === "n8n") return n8nService.bootstrapWorkflows();
    if (provider === "whatsapp" || provider === "evolution") return whatsappService.configureWebhook(userId, publicIntegrationUrls.whatsappWebhookUrl);
    return { status: "manual_action_required", message: "Bootstrap automatico nao disponivel para este provider." };
  },
  async logs(userId: string) {
    const modules = ["integrations", "n8n", "whatsapp", "finance", "home-assistant", "backup", "monitoring", "event-bus"];
    const logs = await prisma.systemLog.findMany({
      where: { OR: [{ userId }, { userId: null }], module: { in: modules } },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, level: true, module: true, action: true, message: true, metadata: true, createdAt: true }
    });
    return { logs };
  },
  async wizard(userId: string) {
    const status = await this.status(userId);
    return {
      steps: [
        { id: "api", title: "API publica", status: status.providers.api_public.status, url: status.urls.apiPublicUrl },
        { id: "n8n", title: "n8n", status: status.providers.n8n.status, url: status.urls.n8nPublicUrl },
        { id: "evolution", title: "Evolution API", status: status.providers.whatsapp.status, webhookUrl: status.urls.whatsappWebhookUrl },
        { id: "whatsapp", title: "WhatsApp", status: status.providers.whatsapp.status, wakePhrase: "ei jarvis" },
        { id: "finance", title: "Financeiro", status: status.providers.finance.status, requireImportReview: true },
        { id: "monitoring", title: "Monitoramento", status: status.providers.monitoring.status, url: status.urls.publicHealthUrl }
      ],
      status
    };
  },
  async events(userId: string) {
    const events = await prisma.integrationEvent.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { events };
  },
  async retryEvent(userId: string, id: string) {
    const event = await prisma.integrationEvent.findFirstOrThrow({ where: { id, OR: [{ userId }, { userId: null }] } });
    if (["homeassistant.action.executed", "whatsapp.file.received"].includes(event.type)) {
      return { status: "confirmation_required", message: "Esse evento exige revisao manual antes de reenviar." };
    }
    return emitJarvisEvent({ userId: event.userId ?? userId, type: event.type, payload: event.payloadRedacted, target: event.target, notify: false });
  }
};
