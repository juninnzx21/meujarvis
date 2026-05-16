import axios from "axios";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";
import { redactSensitive } from "../utils/redact.js";

const keys = {
  webhookUrl: "n8n_webhook_url",
  apiKey: "n8n_api_key"
};

type N8nRuntimeConfig = {
  webhookUrl: string;
  apiKey: string;
  source: "settings" | "env";
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export const n8nService = {
  configured: Boolean(env.N8N_WEBHOOK_URL),
  async runtimeConfig(userId?: string): Promise<N8nRuntimeConfig> {
    if (userId) {
      const rows = await prisma.setting.findMany({
        where: { userId, key: { in: Object.values(keys) } }
      });
      const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
      const webhookUrl = asString(settings[keys.webhookUrl]);
      const apiKey = asString(settings[keys.apiKey]);
      if (webhookUrl || apiKey) return { webhookUrl, apiKey, source: "settings" };
    }
    return { webhookUrl: env.N8N_WEBHOOK_URL, apiKey: env.N8N_API_KEY, source: "env" };
  },
  isConfigured(config: N8nRuntimeConfig) {
    return Boolean(config.webhookUrl);
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
      webhookConfigured: Boolean(config.webhookUrl),
      webhookUrl: config.webhookUrl || "",
      apiKeyConfigured: Boolean(config.apiKey),
      apiKeyMasked: maskSecret(config.apiKey)
    };
  },
  async getConfig(userId: string) {
    return this.userStatus(userId);
  },
  async saveConfig(userId: string, input: { webhookUrl: string; apiKey?: string }) {
    const current = await this.runtimeConfig(userId);
    const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : current.apiKey;
    const entries: Array<[string, Prisma.InputJsonValue]> = [
      [keys.webhookUrl, input.webhookUrl.trim()],
      [keys.apiKey, apiKey]
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
      metadata: { webhookConfigured: Boolean(input.webhookUrl), apiKeyConfigured: Boolean(apiKey) }
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
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
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
  }
};
