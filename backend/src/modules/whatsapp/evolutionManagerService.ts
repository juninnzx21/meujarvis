import axios, { type AxiosError, type AxiosResponse } from "axios";
import QRCode from "qrcode";
import { prisma } from "../../prisma/client.js";
import { redactSensitive } from "../../utils/redact.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { whatsappService } from "../../services/whatsappService.js";

const instanceKey = "whatsapp_evolution_instance";
const defaultWebhookUrl = "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook";

type EvolutionConfig = Awaited<ReturnType<typeof whatsappService.runtimeConfig>>;

type QrRawType = "data_url" | "base64" | "code" | "pairing_code" | "unknown";

type ManualAction = {
  status: "manual_action_required";
  message: string;
  manualActionRequired: true;
  checklist: string[];
};

function manualAction(message: string): ManualAction {
  return {
    status: "manual_action_required",
    message,
    manualActionRequired: true,
    checklist: [
      "Abrir o manager da Evolution API.",
      "Selecionar ou criar a instancia do JARVIS.",
      "Abrir Webhook/Eventos.",
      `Colar a URL oficial: ${defaultWebhookUrl}`,
      "Ativar eventos de mensagens recebidas, documentos/anexos e audio.",
      "Salvar e testar com: ei jarvis status do sistema."
    ]
  };
}

function axiosStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return String(redactSensitive(message));
}

function isConfigured(config: EvolutionConfig) {
  return Boolean(config.apiUrl && config.apiKey && config.instance);
}

function findStringByKey(value: unknown, patterns: RegExp[]): string {
  if (!value || typeof value !== "object") return "";
  const stack = [value as Record<string, unknown>];
  const seen = new Set<unknown>();
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const [key, item] of Object.entries(current)) {
      if (typeof item === "string" && patterns.some((pattern) => pattern.test(key))) return item;
      if (item && typeof item === "object") stack.push(item as Record<string, unknown>);
    }
  }
  return "";
}

function extractConnectionState(value: unknown): string {
  if (typeof value === "string") return value;
  const found = findStringByKey(value, [/^(state|status|connectionState|connectionStatus)$/i]);
  return found || "unknown";
}

function normalizeInstanceStatus(state: string) {
  const normalized = state.toLowerCase();
  if (["open", "connected", "connect", "online"].includes(normalized)) return "connected";
  if (["close", "closed", "disconnected", "offline"].includes(normalized)) return "disconnected";
  if (["connecting", "loading", "pairing"].includes(normalized)) return "connecting";
  return "unknown";
}

function possibleQrValue(response: unknown) {
  return findStringByKey(response, [/^(qrcode|base64|qr|dataUrl|code)$/i]);
}

export async function normalizeQrResponse(response: unknown) {
  const pairingCode = findStringByKey(response, [/pairingCode/i]) || null;
  const value = possibleQrValue(response);
  if (!value && pairingCode) {
    return { qrCodeDataUrl: null, pairingCode, rawType: "pairing_code" as QrRawType, canRenderQr: false };
  }
  if (!value) {
    return { qrCodeDataUrl: null, pairingCode, rawType: "unknown" as QrRawType, canRenderQr: false };
  }
  if (/^data:image\//i.test(value)) {
    return { qrCodeDataUrl: value, pairingCode, rawType: "data_url" as QrRawType, canRenderQr: true };
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(value) && value.replace(/\s/g, "").length > 80) {
    return {
      qrCodeDataUrl: `data:image/png;base64,${value.replace(/\s/g, "")}`,
      pairingCode,
      rawType: "base64" as QrRawType,
      canRenderQr: true
    };
  }
  const qrCodeDataUrl = await QRCode.toDataURL(value, { margin: 1, width: 280 });
  return { qrCodeDataUrl, pairingCode, rawType: "code" as QrRawType, canRenderQr: true };
}

export function normalizeConnectionState(response: unknown) {
  const rawState = extractConnectionState(response);
  const connectionState = normalizeInstanceStatus(rawState);
  return { rawState, connectionState };
}

async function requestEvolution<T>(
  config: EvolutionConfig,
  method: "get" | "post" | "delete",
  path: string,
  data?: unknown
): Promise<AxiosResponse<T>> {
  const url = `${config.apiUrl}${path}`;
  return axios.request<T>({
    method,
    url,
    data,
    headers: { apikey: config.apiKey },
    timeout: 20000
  });
}

async function firstSupported<T>(
  config: EvolutionConfig,
  attempts: Array<{ method: "get" | "post" | "delete"; path: string; data?: unknown }>
) {
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await requestEvolution<T>(config, attempt.method, attempt.path, attempt.data);
    } catch (error) {
      lastError = error;
      if (![404, 405].includes(axiosStatus(error) ?? 0)) throw error;
    }
  }
  throw lastError;
}

export const evolutionManagerService = {
  async getConfig(userId: string) {
    return whatsappService.runtimeConfig(userId);
  },

  async getSafeStatus(userId: string) {
    const config = await this.getConfig(userId);
    const state = isConfigured(config) ? await this.getConnectionState(userId, config.instance) : null;
    return {
      status: isConfigured(config) ? "configured" : "not_configured",
      configured: isConfigured(config),
      apiUrlConfigured: Boolean(config.apiUrl),
      apiKeyConfigured: Boolean(config.apiKey),
      instanceConfigured: Boolean(config.instance),
      instance: config.instance,
      autoReply: config.autoReply,
      source: config.source,
      connectionState: state?.connectionState ?? "unknown",
      webhookUrl: defaultWebhookUrl
    };
  },

  async listInstances(userId: string) {
    const config = await this.getConfig(userId);
    if (!config.apiUrl || !config.apiKey) return { status: "not_configured", instances: [], message: "Evolution API nao configurada." };
    try {
      const response = await firstSupported<unknown>(config, [
        { method: "get", path: "/instance/fetchInstances" },
        { method: "get", path: "/instance/list" },
        { method: "get", path: "/instance/all" }
      ]);
      return { status: "success", instances: redactSensitive(response.data) };
    } catch (error) {
      if ([404, 405].includes(axiosStatus(error) ?? 0)) return { ...manualAction("Esta versao da Evolution nao disponibilizou listagem de instancias pela API."), instances: [] };
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "evolution_instances_failed", message: "Falha ao listar instancias Evolution", metadata: { statusCode: axiosStatus(error), error: safeMessage(error) } });
      return { status: "error", instances: [], message: "Nao foi possivel listar instancias agora." };
    }
  },

  async createInstance(userId: string, instanceName: string) {
    const config = await this.getConfig(userId);
    if (!config.apiUrl || !config.apiKey) return { status: "not_configured", message: "Configure URL e API key da Evolution antes de criar instancia." };
    try {
      const response = await firstSupported<unknown>(config, [
        { method: "post", path: "/instance/create", data: { instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" } },
        { method: "post", path: "/instance/create", data: { instanceName, qrcode: true } },
        { method: "post", path: "/instance/create", data: { instanceName } }
      ]);
      await prisma.setting.upsert({
        where: { userId_key: { userId, key: instanceKey } },
        update: { value: instanceName },
        create: { userId, key: instanceKey, value: instanceName }
      });
      const qr = await normalizeQrResponse(response.data);
      await writeSystemLog({ userId, module: "whatsapp", action: "evolution_instance_create", message: "Instancia Evolution criada ou solicitada", metadata: { instanceName, status: response.status, qrType: qr.rawType, canRenderQr: qr.canRenderQr } });
      return { status: "success", instance: instanceName, message: "Instancia criada ou localizada.", ...qr };
    } catch (error) {
      if ([404, 405].includes(axiosStatus(error) ?? 0)) return manualAction("Esta versao da Evolution nao aceitou criacao automatica de instancia.");
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "evolution_instance_create_failed", message: "Falha ao criar instancia Evolution", metadata: { statusCode: axiosStatus(error), error: safeMessage(error) } });
      return { status: "error", message: "Nao foi possivel criar a instancia pela API." };
    }
  },

  async connectInstance(userId: string, instanceName?: string) {
    const config = await this.getConfig(userId);
    const instance = instanceName || config.instance;
    if (!isConfigured({ ...config, instance })) return { status: "not_configured", message: "Configure URL, API key e instancia da Evolution antes de gerar QR Code." };
    try {
      const response = await firstSupported<unknown>({ ...config, instance }, [
        { method: "get", path: `/instance/connect/${encodeURIComponent(instance)}` },
        { method: "post", path: `/instance/connect/${encodeURIComponent(instance)}` }
      ]);
      const qr = await normalizeQrResponse(response.data);
      await writeSystemLog({ userId, module: "whatsapp", action: "evolution_connect", message: "QR Code Evolution solicitado", metadata: { instanceName: instance, status: response.status, qrType: qr.rawType, canRenderQr: qr.canRenderQr } });
      return { status: "success", instance, connectionState: "connecting", message: qr.canRenderQr ? "QR Code gerado. Escaneie pelo WhatsApp." : "Evolution respondeu, mas nao retornou QR renderizavel.", ...qr };
    } catch (error) {
      if ([404, 405].includes(axiosStatus(error) ?? 0)) return manualAction("Esta versao da Evolution nao aceitou gerar QR Code por API.");
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "evolution_connect_failed", message: "Falha ao solicitar QR Code Evolution", metadata: { statusCode: axiosStatus(error), error: safeMessage(error) } });
      return { status: "error", message: "Nao foi possivel gerar QR Code agora." };
    }
  },

  async getConnectionState(userId: string, instanceName?: string) {
    const config = await this.getConfig(userId);
    const instance = instanceName || config.instance;
    if (!isConfigured({ ...config, instance })) return { status: "not_configured", instance, connectionState: "unknown", message: "Evolution API nao configurada." };
    try {
      const response = await requestEvolution<unknown>({ ...config, instance }, "get", `/instance/connectionState/${encodeURIComponent(instance)}`);
      const state = normalizeConnectionState(response.data);
      return { status: "success", instance, ...state, message: state.connectionState === "connected" ? "WhatsApp conectado." : "WhatsApp ainda nao conectado." };
    } catch (error) {
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "evolution_state_failed", message: "Falha ao consultar estado Evolution", metadata: { statusCode: axiosStatus(error), error: safeMessage(error) } });
      return { status: "error", instance, connectionState: "unknown", message: "Nao foi possivel consultar o estado da instancia." };
    }
  },

  async logoutInstance(userId: string, instanceName?: string) {
    const config = await this.getConfig(userId);
    const instance = instanceName || config.instance;
    if (!isConfigured({ ...config, instance })) return { status: "not_configured", message: "Evolution API nao configurada." };
    try {
      await firstSupported(config, [
        { method: "delete", path: `/instance/logout/${encodeURIComponent(instance)}` },
        { method: "post", path: `/instance/logout/${encodeURIComponent(instance)}` }
      ]);
      return { status: "success", instance, connectionState: "disconnected", message: "Instancia desconectada." };
    } catch {
      return manualAction("Nao foi possivel desconectar automaticamente nesta versao da Evolution.");
    }
  },

  async restartInstance(userId: string, instanceName?: string) {
    const config = await this.getConfig(userId);
    const instance = instanceName || config.instance;
    if (!isConfigured({ ...config, instance })) return { status: "not_configured", message: "Evolution API nao configurada." };
    try {
      await firstSupported(config, [
        { method: "post", path: `/instance/restart/${encodeURIComponent(instance)}` },
        { method: "post", path: `/instance/restart`, data: { instanceName: instance } }
      ]);
      return { status: "success", instance, message: "Reinicio da instancia solicitado." };
    } catch {
      return manualAction("Nao foi possivel reiniciar automaticamente nesta versao da Evolution.");
    }
  },

  async configureWebhook(userId: string, instanceName?: string, webhookUrl = defaultWebhookUrl) {
    const config = await this.getConfig(userId);
    const instance = instanceName || config.instance;
    if (!isConfigured({ ...config, instance })) return { status: "not_configured", message: "Evolution API nao configurada.", webhookUrl };
    const payloads = [
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: true,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE"]
        }
      },
      {
        enabled: true,
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: true,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE"]
      }
    ];
    try {
      const response = await firstSupported(config, [
        { method: "post", path: `/webhook/set/${encodeURIComponent(instance)}`, data: payloads[0] },
        { method: "post", path: `/webhook/${encodeURIComponent(instance)}`, data: payloads[1] },
        { method: "post", path: `/webhook/set`, data: { instanceName: instance, ...payloads[1] } }
      ]);
      await writeSystemLog({ userId, module: "whatsapp", action: "evolution_webhook_configure", message: "Webhook Evolution configurado pelo painel", metadata: { status: response.status, webhookUrl, instance } });
      return { status: "success", webhookUrl, instance, manualActionRequired: false, message: "Webhook configurado na Evolution API." };
    } catch (error) {
      if ([404, 405].includes(axiosStatus(error) ?? 0)) return { ...manualAction("Esta versao da Evolution nao aceitou configuracao automatica do webhook."), webhookUrl, instance };
      await writeSystemLog({ userId, level: "warning", module: "whatsapp", action: "evolution_webhook_configure_failed", message: "Falha ao configurar webhook Evolution", metadata: { statusCode: axiosStatus(error), webhookUrl, instance, error: safeMessage(error) } });
      return { status: "error", webhookUrl, instance, message: "Nao foi possivel configurar o webhook automaticamente." };
    }
  },

  async testConnection(userId: string) {
    const config = await this.getConfig(userId);
    if (!isConfigured(config)) return { status: "not_configured", message: "Evolution API nao configurada." };
    return this.getConnectionState(userId, config.instance);
  }
};
