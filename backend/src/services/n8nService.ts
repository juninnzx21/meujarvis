import axios from "axios";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";
import { redactSensitive } from "../utils/redact.js";
import { decryptSettingValue, encryptSettingValue, maskSecret } from "./encryptionService.js";

const keys = {
  webhookUrl: "n8n_webhook_url",
  apiKey: "n8n_api_key",
  enabled: "n8n_enabled",
  webhookSecret: "n8n_webhook_secret"
};

export const n8nTemplates = [
  "task.created",
  "task.completed",
  "task.overdue",
  "routine.run",
  "backup.completed",
  "system.alert",
  "finance.transaction.created",
  "finance.statement.import.created",
  "whatsapp.command.received",
  "whatsapp.statement.received",
  "jarvis.daily.summary",
  "jarvis.weekly.report",
  "integration.failed",
  "scheduler.tick_error"
] as const;

type N8nRuntimeConfig = {
  webhookUrl: string;
  apiKey: string;
  webhookSecret: string;
  enabled: boolean;
  source: "settings" | "env";
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function listLocalWorkflowFiles() {
  const dir = join(process.cwd(), "..", "n8n", "workflows");
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(dir);
  return files.filter((file) => file.endsWith(".json")).sort().map((file) => ({
    name: file,
    template: file.replace(/^jarvis-/, "").replace(/\.json$/, "").replace(/-/g, "."),
    path: `n8n/workflows/${file}`
  }));
}

export const n8nService = {
  configured: Boolean(env.N8N_WEBHOOK_URL),
  async runtimeConfig(userId?: string): Promise<N8nRuntimeConfig> {
    if (userId) {
      const rows = await prisma.setting.findMany({
        where: { userId, key: { in: Object.values(keys) } }
      });
      const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
      const webhookUrl = asString(decryptSettingValue(keys.webhookUrl, settings[keys.webhookUrl]));
      const apiKey = asString(decryptSettingValue(keys.apiKey, settings[keys.apiKey]));
      const webhookSecret = asString(decryptSettingValue(keys.webhookSecret, settings[keys.webhookSecret]));
      const enabled = settings[keys.enabled] === undefined ? true : Boolean(settings[keys.enabled]);
      if (webhookUrl || apiKey || webhookSecret) return { webhookUrl, apiKey, webhookSecret, enabled, source: "settings" };
    }
    return { webhookUrl: env.N8N_WEBHOOK_URL, apiKey: env.N8N_API_KEY, webhookSecret: "", enabled: true, source: "env" };
  },
  isConfigured(config: N8nRuntimeConfig) {
    return Boolean(config.enabled && config.webhookUrl);
  },
  status() {
    return { configured: this.configured, status: this.configured ? "configured" : "not_configured", webhookConfigured: Boolean(env.N8N_WEBHOOK_URL) };
  },
  async userStatus(userId: string) {
    const config = await this.runtimeConfig(userId);
    const configured = this.isConfigured(config);
    return {
      configured,
      status: configured ? "configured" : "not_configured",
      source: config.source,
      enabled: config.enabled,
      webhookConfigured: Boolean(config.webhookUrl),
      webhookUrl: config.webhookUrl || "",
      apiKeyConfigured: Boolean(config.apiKey),
      apiKeyMasked: maskSecret(config.apiKey),
      webhookSecretConfigured: Boolean(config.webhookSecret),
      templates: n8nTemplates
    };
  },
  async getConfig(userId: string) {
    return this.userStatus(userId);
  },
  async saveConfig(userId: string, input: { webhookUrl: string; apiKey?: string; webhookSecret?: string; enabled?: boolean }) {
    const current = await this.runtimeConfig(userId);
    const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : current.apiKey;
    const webhookSecret = input.webhookSecret?.trim() ? input.webhookSecret.trim() : current.webhookSecret;
    const entries: Array<[string, Prisma.InputJsonValue]> = [
      [keys.webhookUrl, input.webhookUrl.trim()],
      [keys.apiKey, encryptSettingValue(keys.apiKey, apiKey) as Prisma.InputJsonValue],
      [keys.webhookSecret, encryptSettingValue(keys.webhookSecret, webhookSecret) as Prisma.InputJsonValue],
      [keys.enabled, input.enabled ?? true]
    ];
    await Promise.all(entries.map(([key, value]) => prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value }
    })));
    await writeSystemLog({
      userId,
      module: "n8n",
      action: "config_save",
      message: "Configuracao n8n atualizada",
      metadata: { webhookConfigured: Boolean(input.webhookUrl), apiKeyConfigured: Boolean(apiKey), webhookSecretConfigured: Boolean(webhookSecret), enabled: input.enabled ?? true }
    });
    return this.userStatus(userId);
  },
  async clearConfig(userId: string) {
    await prisma.setting.deleteMany({ where: { userId, key: { in: Object.values(keys) } } });
    await writeSystemLog({ userId, module: "n8n", action: "config_clear", message: "Configuracao n8n removida" });
    return this.userStatus(userId);
  },
  async trigger(payload: unknown, userId?: string) {
    const config = await this.runtimeConfig(userId);
    if (!this.isConfigured(config)) {
      await writeSystemLog({ userId, level: "warning", module: "n8n", action: "trigger", message: "n8n nao configurado" });
      return { status: "not_configured", message: "N8N_WEBHOOK_URL nao configurado." };
    }
    try {
      const response = await axios.post(config.webhookUrl, payload, {
        headers: {
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          ...(config.webhookSecret ? { "X-Jarvis-Webhook-Secret": config.webhookSecret } : {})
        },
        timeout: 15000
      });
      await writeSystemLog({ userId, module: "n8n", action: "trigger", message: "Webhook n8n acionado", metadata: { request: redactSensitive(payload), response: { status: response.status, data: redactSensitive(response.data) } } as never });
      return { status: "success", data: response.data };
    } catch (error) {
      await writeSystemLog({ userId, level: "error", module: "n8n", action: "trigger", message: "Erro ao acionar n8n" });
      throw error;
    }
  },
  async test(userId?: string) {
    return this.trigger({ source: "jarvis", type: "safe_test", timestamp: new Date().toISOString() }, userId);
  },
  async testTemplate(template: string, userId?: string) {
    if (!n8nTemplates.includes(template as (typeof n8nTemplates)[number])) {
      return { status: "invalid_template", message: "Template n8n desconhecido." };
    }
    return this.trigger({ source: "jarvis", type: template, safe: true, timestamp: new Date().toISOString(), payload: { dryRun: true } }, userId);
  },
  bootstrapWorkflows() {
    return {
      status: "manual_import_required",
      message: "Workflows padrao estao em n8n/workflows. Importe no n8n e configure credenciais reais no proprio n8n.",
      workflowsPath: "n8n/workflows",
      templates: n8nTemplates
    };
  },
  async localWorkflows() {
    return { workflows: await listLocalWorkflowFiles() };
  },
  async importWorkflow(name: string, userId?: string) {
    const safeName = name.replace(/[^a-z0-9_.-]/gi, "");
    const workflows = await listLocalWorkflowFiles();
    const workflow = workflows.find((item) => item.name === safeName);
    if (!workflow) return { status: "not_found", message: "Workflow local nao encontrado." };
    const config = await this.runtimeConfig(userId);
    if (!config.apiKey) {
      return {
        status: "manual_action_required",
        message: "API key do n8n nao configurada. Importe manualmente pelo painel n8n.",
        workflow
      };
    }
    try {
      const content = JSON.parse(await readFile(join(process.cwd(), "..", workflow.path), "utf8")) as unknown;
      const response = await axios.post(`${config.webhookUrl.replace(/\/webhook\/?.*$/i, "")}/api/v1/workflows`, content, {
        headers: { "X-N8N-API-KEY": config.apiKey },
        timeout: 20000
      });
      await writeSystemLog({ userId, module: "n8n", action: "workflow_import", message: "Workflow n8n importado", metadata: { workflow: workflow.name, status: response.status } });
      return { status: "success", workflow: workflow.name };
    } catch {
      return {
        status: "manual_action_required",
        message: "Importacao automatica nao ficou disponivel. Use o arquivo local no painel n8n.",
        workflow
      };
    }
  },
  async importAllWorkflows(userId?: string) {
    const workflows = await listLocalWorkflowFiles();
    const results = [];
    for (const workflow of workflows) results.push(await this.importWorkflow(workflow.name, userId));
    return { status: results.some((item) => item.status === "success") ? "partial" : "manual_action_required", results };
  },
  async testWorkflowName(name: string, userId?: string) {
    const workflows = await listLocalWorkflowFiles();
    const workflow = workflows.find((item) => item.name === name || item.template === name);
    if (!workflow) return { status: "not_found", message: "Workflow local nao encontrado." };
    return this.trigger({ source: "jarvis", type: workflow.template, workflow: workflow.name, safe: true, timestamp: new Date().toISOString() }, userId);
  }
};
