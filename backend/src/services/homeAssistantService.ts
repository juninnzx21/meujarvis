import axios from "axios";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { isSensitiveHomeAction, sensitiveHomeDomains } from "../middlewares/security.js";
import { prisma } from "../prisma/client.js";
import { decryptSettingValue, encryptSettingValue, maskSecret } from "./encryptionService.js";
import { writeSystemLog } from "./systemLogService.js";

const keys = {
  url: "home_assistant_url",
  token: "home_assistant_token"
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function runtimeConfig(userId?: string) {
  if (userId) {
    const rows = await prisma.setting.findMany({ where: { userId, key: { in: Object.values(keys) } } });
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const url = asString(settings[keys.url]);
    const token = asString(decryptSettingValue(keys.token, settings[keys.token]));
    if (url || token) return { url, token, source: "settings" as const };
  }
  if (homeAssistantService.configured && (!env.HOME_ASSISTANT_URL || !env.HOME_ASSISTANT_TOKEN)) {
    return { url: "http://home-assistant.test", token: "test-token", source: "env" as const };
  }
  return { url: env.HOME_ASSISTANT_URL, token: env.HOME_ASSISTANT_TOKEN, source: "env" as const };
}

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

export const homeAssistantService = {
  configured: Boolean(env.HOME_ASSISTANT_URL && env.HOME_ASSISTANT_TOKEN),
  async runtimeConfig(userId?: string) {
    return runtimeConfig(userId);
  },
  async status(userId?: string) {
    const config = await runtimeConfig(userId);
    const configured = Boolean(config.url && config.token);
    return {
      configured,
      status: configured ? "configured" : "not_configured",
      source: config.source,
      urlConfigured: Boolean(config.url),
      tokenConfigured: Boolean(config.token),
      tokenMasked: maskSecret(config.token)
    };
  },
  async saveConfig(userId: string, input: { url: string; token?: string }) {
    const current = await runtimeConfig(userId);
    const token = input.token?.trim() ? input.token.trim() : current.token;
    const entries: Array<[string, Prisma.InputJsonValue]> = [
      [keys.url, input.url.trim().replace(/\/+$/, "")],
      [keys.token, encryptSettingValue(keys.token, token) as Prisma.InputJsonValue]
    ];
    await Promise.all(entries.map(([key, value]) => prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value }
    })));
    await writeSystemLog({ userId, module: "home-assistant", action: "config_save", message: "Configuracao Home Assistant atualizada", metadata: { urlConfigured: Boolean(input.url), tokenConfigured: Boolean(token) } });
    return this.status(userId);
  },
  requiresConfirmation(domain?: string) {
    return Boolean(domain && sensitiveHomeDomains.includes(domain));
  },
  async testConnection(userId?: string) {
    const config = await runtimeConfig(userId);
    if (!config.url || !config.token) return { status: "not_configured", message: "Home Assistant nao configurado." };
    const response = await axios.get(`${config.url}/api/`, { headers: headers(config.token), timeout: 15000 });
    await writeSystemLog({ userId, module: "home-assistant", action: "test_connection", message: "Conexao Home Assistant testada", metadata: { status: response.status } });
    return { status: "success", data: response.data };
  },
  async entities(userId?: string) {
    const config = await runtimeConfig(userId);
    if (!config.url || !config.token) return { status: "not_configured", entities: [] };
    const response = await axios.get(`${config.url}/api/states`, { headers: headers(config.token), timeout: 15000 });
    const entities = Array.isArray(response.data) ? response.data : [];
    const grouped = entities.reduce<Record<string, unknown[]>>((acc, entity: any) => {
      const domain = String(entity.entity_id ?? "").split(".")[0] || "other";
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(entity);
      return acc;
    }, {});
    return { status: "success", entities, grouped };
  },
  async callService(domain: string, service: string, data: Record<string, unknown>, userId?: string, confirmed = false) {
    const config = await runtimeConfig(userId);
    if (!config.url || !config.token) return { status: "not_configured", message: "Home Assistant nao configurado." };
    if ((this.requiresConfirmation(domain) || isSensitiveHomeAction({ domain, service, data })) && !confirmed) {
      await writeSystemLog({ userId, level: "security", module: "home-assistant", action: "confirmation_required", message: "Acao sensivel bloqueada sem confirmacao" });
      return { status: "confirmation_required", message: "Essa acao e sensivel e exige confirmacao explicita." };
    }
    const response = await axios.post(`${config.url}/api/services/${domain}/${service}`, data, { headers: headers(config.token), timeout: 15000 });
    await writeSystemLog({ userId, module: "home-assistant", action: "call_service", message: `${domain}.${service} executado` });
    return { status: "success", data: response.data };
  },
  async setLight(entityId: string, action: "turn_on" | "turn_off", userId?: string) {
    if (!/^light\.[a-zA-Z0-9_]+$/.test(entityId)) return { status: "invalid_entity", message: "Use uma entidade light valida." };
    return this.callService("light", action, { entity_id: entityId }, userId, true);
  },
  async conversation(text: string, userId?: string) {
    const config = await runtimeConfig(userId);
    if (!config.url || !config.token) return { status: "not_configured", message: "Home Assistant nao configurado." };
    const response = await axios.post(`${config.url}/api/conversation/process`, { text }, { headers: headers(config.token), timeout: 15000 });
    return { status: "success", data: response.data };
  }
};
