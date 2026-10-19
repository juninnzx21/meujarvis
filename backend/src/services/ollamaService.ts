import axios from "axios";
import { getOllamaConfig } from "./aiProviderConfigService.js";
import { writeSystemLog } from "./systemLogService.js";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type OllamaState = "configured" | "not_configured" | "offline" | "model_missing" | "error";
let runtimeState: OllamaState = "not_configured";
let lastLatencyMs: number | null = null;

export const ollamaService = {
  async statusForUser(userId: string) {
    const config = await getOllamaConfig(userId);
    return {
      configured: config.configured,
      baseUrl: config.baseUrl,
      source: config.source,
      model: config.model,
      status: config.configured ? runtimeState === "not_configured" ? "unknown" : runtimeState : "not_configured",
      lastLatencyMs
    };
  },

  async testConnection(userId: string) {
    const config = await getOllamaConfig(userId);
    if (!config.configured) return { status: "not_configured", message: "Configure o Ollama em um endereço privado antes do teste." };
    try {
      const response = await axios.get(`${config.baseUrl}/api/tags`, { timeout: 5000, maxRedirects: 0 });
      const models: string[] = Array.isArray(response.data?.models)
        ? response.data.models.map((item: { name?: unknown }) => String(item.name || "")).filter(Boolean)
        : [];
      if (!models.includes(config.model)) {
        runtimeState = "model_missing";
        return { status: runtimeState, model: config.model, models, message: "O endpoint Ollama respondeu, mas o modelo configurado não está instalado." };
      }
      runtimeState = "configured";
      return { status: "success", model: config.model, models };
    } catch {
      runtimeState = "offline";
      await writeSystemLog({ userId, level: "warning", module: "ai", action: "ollama_connection_test_failed", message: "O teste de conexão com Ollama falhou.", metadata: { reason: "unreachable_or_timeout" } });
      return { status: runtimeState, message: "Não foi possível alcançar Ollama pelo endereço privado configurado." };
    }
  },

  async listModels(userId: string) {
    const config = await getOllamaConfig(userId);
    if (!config.configured) return { status: "not_configured", models: [] as string[] };
    try {
      const response = await axios.get(`${config.baseUrl}/api/tags`, { timeout: 5000, maxRedirects: 0 });
      const models: string[] = Array.isArray(response.data?.models)
        ? response.data.models.map((item: { name?: unknown }) => String(item.name || "")).filter(Boolean)
        : [];
      return { status: "success", models };
    } catch {
      return { status: "offline", models: [] as string[], message: "Não foi possível alcançar Ollama pelo endereço privado configurado." };
    }
  },

  async complete(messages: ChatMessage[], userId?: string) {
    if (!userId) return null;
    const config = await getOllamaConfig(userId);
    if (!config.configured) {
      runtimeState = "not_configured";
      return null;
    }
    const startedAt = Date.now();
    try {
      const response = await axios.post(`${config.baseUrl}/api/chat`, {
        model: config.model,
        messages,
        stream: false,
        keep_alive: "30s",
        options: { num_ctx: 4096 }
      }, { timeout: 90000, maxRedirects: 0 });
      const reply = String(response.data?.message?.content || "").trim();
      lastLatencyMs = Date.now() - startedAt;
      if (!reply) return null;
      runtimeState = "configured";
      return reply;
    } catch {
      runtimeState = "offline";
      lastLatencyMs = Date.now() - startedAt;
      await writeSystemLog({ userId, level: "warning", module: "ai", action: "ollama_completion_failed", message: "Ollama indisponível; o roteador avaliará os provedores alternativos.", metadata: { reason: "request_failed" } });
      return null;
    }
  }
};
