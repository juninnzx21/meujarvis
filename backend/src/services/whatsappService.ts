import axios from "axios";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { openAiService } from "./openAiService.js";
import { writeSystemLog } from "./systemLogService.js";

const keys = {
  apiUrl: "whatsapp_evolution_api_url",
  apiKey: "whatsapp_evolution_api_key",
  instance: "whatsapp_evolution_instance",
  autoReply: "whatsapp_auto_reply"
};

type WhatsAppRuntimeConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
  autoReply: boolean;
  source: "settings" | "env";
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : value === "true";
}

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function findFirstString(value: unknown, keysToMatch: RegExp[]): string {
  if (!value || typeof value !== "object") return "";
  const stack = [value as Record<string, unknown>];
  const seen = new Set<unknown>();
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const [key, item] of Object.entries(current)) {
      if (typeof item === "string" && keysToMatch.some((pattern) => pattern.test(key))) return item;
      if (item && typeof item === "object") stack.push(item as Record<string, unknown>);
    }
  }
  return "";
}

function normalizePhone(phone: string) {
  return phone.replace(/@s\.whatsapp\.net|@c\.us|@g\.us/g, "").replace(/\D/g, "");
}

export const whatsappService = {
  configured: Boolean(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY && env.EVOLUTION_INSTANCE),
  async runtimeConfig(userId?: string): Promise<WhatsAppRuntimeConfig> {
    if (userId) {
      const rows = await prisma.setting.findMany({
        where: { userId, key: { in: Object.values(keys) } }
      });
      const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
      const apiUrl = asString(settings[keys.apiUrl]);
      const apiKey = asString(settings[keys.apiKey]);
      const instance = asString(settings[keys.instance]);
      if (apiUrl || apiKey || instance) {
        return {
          apiUrl,
          apiKey,
          instance,
          autoReply: asBoolean(settings[keys.autoReply]),
          source: "settings"
        };
      }
    }
    return {
      apiUrl: env.EVOLUTION_API_URL,
      apiKey: env.EVOLUTION_API_KEY,
      instance: env.EVOLUTION_INSTANCE,
      autoReply: env.WHATSAPP_AUTO_REPLY,
      source: "env"
    };
  },
  isConfigured(config: WhatsAppRuntimeConfig) {
    return Boolean(config.apiUrl && config.apiKey && config.instance);
  },
  async status(userId?: string) {
    const config = await this.runtimeConfig(userId);
    return {
      configured: this.isConfigured(config),
      autoReply: config.autoReply,
      status: this.isConfigured(config) ? "configured" : "not_configured",
      source: config.source,
      apiUrlConfigured: Boolean(config.apiUrl),
      apiKeyConfigured: Boolean(config.apiKey),
      instanceConfigured: Boolean(config.instance),
      instance: config.instance || "",
      apiUrl: config.apiUrl || "",
      apiKeyMasked: maskSecret(config.apiKey)
    };
  },
  async getConfig(userId: string) {
    return this.status(userId);
  },
  async saveConfig(userId: string, input: { apiUrl: string; apiKey?: string; instance: string; autoReply: boolean }) {
    const current = await this.runtimeConfig(userId);
    const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : current.apiKey;
    const entries: Array<[string, Prisma.InputJsonValue]> = [
      [keys.apiUrl, input.apiUrl.trim()],
      [keys.instance, input.instance.trim()],
      [keys.autoReply, input.autoReply],
      [keys.apiKey, apiKey]
    ];
    await Promise.all(entries.map(([key, value]) => prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value }
    })));
    await writeSystemLog({
      userId,
      module: "whatsapp",
      action: "config_save",
      message: "Configuracao WhatsApp/Evolution atualizada",
      metadata: { apiUrlConfigured: Boolean(input.apiUrl), apiKeyConfigured: Boolean(apiKey), instance: input.instance }
    });
    return this.status(userId);
  },
  async clearConfig(userId: string) {
    await prisma.setting.deleteMany({ where: { userId, key: { in: Object.values(keys) } } });
    await writeSystemLog({ userId, module: "whatsapp", action: "config_clear", message: "Configuracao WhatsApp/Evolution removida" });
    return this.status(userId);
  },
  isValidPhone(phone: string) {
    return /^\d{10,15}$/.test(phone);
  },
  extractInbound(payload: unknown) {
    const body = (payload || {}) as Record<string, any>;
    const phone = String(body?.data?.key?.remoteJid ?? body?.key?.remoteJid ?? body?.phone ?? body?.from ?? "desconhecido");
    const message = body?.data?.message ?? body?.message ?? {};
    const text = String(
      message?.conversation ??
      message?.extendedTextMessage?.text ??
      body?.content ??
      body?.text ??
      ""
    ).trim();
    const audio = message?.audioMessage ?? body?.audioMessage ?? body?.audio ?? null;
    const mediaUrl = findFirstString(audio || body, [/^(url|mediaUrl|downloadUrl|fileUrl)$/i]);
    const base64 = findFirstString(audio || body, [/^(base64|media|file|data)$/i]);
    const mimeType = findFirstString(audio || body, [/mimetype|mimeType/i]) || "audio/ogg";
    const fromJarvis = Boolean(body?.jarvisAutoReply || body?.data?.key?.fromMe || body?.key?.fromMe);
    const isGroup = phone.includes("@g.us");
    return { phone, cleanPhone: normalizePhone(phone), text, mediaUrl, base64, mimeType, fromJarvis, isGroup, hasAudio: Boolean(audio || mediaUrl || base64) };
  },
  async transcribeInboundAudio(payload: unknown, userId?: string) {
    const inbound = this.extractInbound(payload);
    if (!inbound.hasAudio) return { status: "no_audio", text: "" };
    let buffer: Buffer | null = null;
    if (inbound.base64) {
      const normalizedBase64 = inbound.base64.replace(/^data:[^;]+;base64,/, "");
      if (/^[A-Za-z0-9+/=\s]+$/.test(normalizedBase64) && normalizedBase64.length > 64) {
        buffer = Buffer.from(normalizedBase64, "base64");
      }
    } else if (inbound.mediaUrl && /^https?:\/\//i.test(inbound.mediaUrl)) {
      const config = await this.runtimeConfig(userId);
      const response = await axios.get<ArrayBuffer>(inbound.mediaUrl, {
        responseType: "arraybuffer",
        headers: config.apiKey ? { apikey: config.apiKey } : undefined,
        timeout: 30000
      });
      buffer = Buffer.from(response.data);
    }
    if (!buffer || buffer.length === 0) return { status: "audio_unavailable", text: "", message: "Audio recebido, mas a midia nao veio disponivel para transcricao." };
    const transcribed = await openAiService.transcribeAudio({ buffer, mimeType: inbound.mimeType, filename: "whatsapp-audio.ogg" });
    if (transcribed.text) {
      await writeSystemLog({ userId, module: "whatsapp", action: "audio_transcribed", message: "Audio WhatsApp transcrito com sucesso", metadata: { phone: inbound.cleanPhone, bytes: buffer.length } });
    }
    return transcribed;
  },
  async testConnection(userId?: string) {
    const config = await this.runtimeConfig(userId);
    if (!this.isConfigured(config)) {
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "test_connection", message: "WhatsApp nao configurado" });
      return { status: "not_configured", message: "Evolution API nao configurada." };
    }
    try {
      const response = await axios.get(`${config.apiUrl}/instance/connectionState/${config.instance}`, {
        headers: { apikey: config.apiKey },
        timeout: 15000
      });
      await writeSystemLog({ userId, module: "whatsapp", action: "test_connection", message: "Conexao Evolution API testada", metadata: { status: response.status } });
      return { status: "success", data: response.data };
    } catch (error) {
      const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = statusCode === 404
        ? "Evolution API respondeu, mas a instancia nao foi encontrada. Confira o nome da instancia e a API key."
        : statusCode === 401 || statusCode === 403
          ? "Evolution API recusou a chave. Confira a API key."
          : "Nao foi possivel testar a Evolution API agora.";
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "test_connection_failed", message, metadata: { statusCode } });
      return { status: "error", message };
    }
  },
  async send(phone: string, content: string, userId?: string) {
    if (!this.isValidPhone(phone)) return { status: "invalid_phone", message: "Numero deve conter apenas digitos, com DDI, entre 10 e 15 caracteres." };
    const config = await this.runtimeConfig(userId);
    if (!this.isConfigured(config)) {
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "send", message: "WhatsApp nao configurado" });
      return { status: "not_configured", message: "Evolution API nao configurada." };
    }
    const payload = { number: phone, text: content };
    const url = `${config.apiUrl}/message/sendText/${config.instance}`;
    const response = await axios.post(url, payload, {
      headers: { apikey: config.apiKey },
      timeout: 15000
    });
    await prisma.whatsAppMessage.create({
      data: { userId, phone, content, direction: "outbound", status: "sent", rawPayload: response.data }
    });
    await writeSystemLog({ userId, module: "whatsapp", action: "send", message: "Mensagem WhatsApp enviada" });
    return { status: "success", data: response.data };
  }
};
