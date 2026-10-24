import axios from "axios";
import { env } from "../config/env.js";
import { getAiProviderConfig } from "./aiProviderConfigService.js";
import { writeSystemLog } from "./systemLogService.js";

type GeminiStatus = "configured" | "missing_key" | "invalid_key" | "quota_exceeded" | "model_not_found" | "network_error" | "api_error";
let runtimeStatus: GeminiStatus = env.GEMINI_API_KEY ? "configured" : "missing_key";

function classifyGeminiError(error: unknown): GeminiStatus {
  const axiosLike = error as { response?: { status?: number; data?: unknown }; code?: string; message?: string };
  const message = error instanceof Error ? error.message : String(error);
  const responseData = typeof axiosLike.response?.data === "string" ? axiosLike.response.data : JSON.stringify(axiosLike.response?.data ?? {});
  const combined = `${axiosLike.response?.status ?? ""} ${axiosLike.code ?? ""} ${message} ${responseData}`;
  if (/401|403|API_KEY_INVALID|invalid.?api.?key|permission.?denied|unauthorized|forbidden/i.test(combined)) return "invalid_key";
  if (/429|quota|billing|exceeded|RESOURCE_EXHAUSTED/i.test(combined)) return "quota_exceeded";
  if (/404|model.?not.?found|not found|invalid.?model/i.test(combined)) return "model_not_found";
  if (/network|timeout|ECONN|ENOTFOUND|fetch failed/i.test(combined)) return "network_error";
  return "api_error";
}

function toGeminiPrompt(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
}

export const geminiService = {
  get configured() {
    return Boolean(env.GEMINI_API_KEY);
  },
  status() {
    return {
      configured: Boolean(env.GEMINI_API_KEY),
      model: env.GEMINI_MODEL,
      source: env.GEMINI_API_KEY ? "ambiente" : "ausente",
      status: runtimeStatus
    };
  },
  async statusForUser(userId: string, includeEnvironmentFallback = true) {
    const config = await getAiProviderConfig("gemini", userId, { allowEnvironmentFallback: includeEnvironmentFallback });
    return {
      configured: config.configured,
      keyConfigured: config.configured,
      model: config.model,
      source: config.source,
      status: config.configured ? "configured" : "missing_key"
    };
  },
  async healthStatusForUser(userId: string) {
    const config = await getAiProviderConfig("gemini", userId, { allowEnvironmentFallback: false });
    return { configured: config.configured, status: config.configured ? "configured" : "not_configured" };
  },
  async listModelsForUser(userId: string) {
    const config = await getAiProviderConfig("gemini", userId);
    if (!config.apiKey) return { status: "not_configured", models: [] as string[], message: "Configure a chave Gemini antes de carregar os modelos." };
    try {
      const response = await axios.get("https://generativelanguage.googleapis.com/v1beta/models", { params: { key: config.apiKey }, timeout: 15000 });
      const models = (Array.isArray(response.data?.models) ? response.data.models : [])
        .filter((model: { supportedGenerationMethods?: string[] }) => model.supportedGenerationMethods?.includes("generateContent"))
        .map((model: { name?: string }) => String(model.name || "").replace(/^models\//, ""))
        .filter(Boolean)
        .sort();
      runtimeStatus = "configured";
      return { status: "success", models };
    } catch (error) {
      const reason = classifyGeminiError(error);
      await writeSystemLog({ userId, level: "warning", module: "ai", action: "gemini_models_list_failed", message: "Nao foi possivel carregar a lista de modelos Gemini.", metadata: { reason } });
      return { status: reason, models: [] as string[], message: "Nao foi possivel carregar os modelos. Confira a chave e tente novamente." };
    }
  },
  async testConnection(userId: string) {
    const config = await getAiProviderConfig("gemini", userId);
    if (!config.apiKey) return { status: "not_configured", message: "Configure uma chave do Gemini antes do teste." };
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}`;
      const response = await axios.get(url, { params: { key: config.apiKey }, timeout: 15000 });
      runtimeStatus = "configured";
      return { status: response.status === 200 ? "success" : "api_error", model: config.model };
    } catch (error) {
      runtimeStatus = classifyGeminiError(error);
      await writeSystemLog({ userId, level: "warning", module: "ai", action: "gemini_connection_test_failed", message: "Teste de conexao Gemini falhou.", metadata: { reason: runtimeStatus } });
      return { status: runtimeStatus, message: "O Gemini nao confirmou a conexao. Confira a chave, o modelo e os limites da conta." };
    }
  },
  async complete(messages: { role: "system" | "user" | "assistant"; content: string }[], userId?: string) {
    const config = await getAiProviderConfig("gemini", userId);
    if (!config.apiKey) {
      runtimeStatus = "missing_key";
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: toGeminiPrompt(messages) }]
            }
          ],
          generationConfig: { temperature: 0.4 }
        },
        {
          params: { key: config.apiKey },
          timeout: 20000
        }
      );
      runtimeStatus = "configured";
      const text = response.data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
      return text || null;
    } catch (error) {
      runtimeStatus = classifyGeminiError(error);
      await writeSystemLog({
        userId,
        level: "warning",
        module: "ai",
        action: "gemini_fallback_failed",
        message: "Gemini indisponivel; fallback local mantido.",
        metadata: { reason: runtimeStatus }
      });
      return null;
    }
  },
  async completeWithSearch(messages: { role: "system" | "user" | "assistant"; content: string }[], userId?: string) {
    const config = await getAiProviderConfig("gemini", userId);
    if (!config.apiKey) return null;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
      const response = await axios.post(url, {
        contents: [{ role: "user", parts: [{ text: toGeminiPrompt(messages) }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.3 }
      }, { headers: { "x-goog-api-key": config.apiKey }, timeout: 45000 });
      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
      if (!text) return null;
      const grounding = candidate?.groundingMetadata;
      const sources = (Array.isArray(grounding?.groundingChunks) ? grounding.groundingChunks : [])
        .map((chunk: { web?: { uri?: string; title?: string } }) => ({
          type: "web" as const,
          title: String(chunk.web?.title || "Fonte da web").slice(0, 180),
          excerpt: "Fonte usada pela busca Google do Gemini.",
          url: String(chunk.web?.uri || "")
        }))
        .filter((source: { url: string }) => {
          try { return ["http:", "https:"].includes(new URL(source.url).protocol); } catch { return false; }
        })
        .filter((source: { url: string }, index: number, all: Array<{ url: string }>) => all.findIndex((item) => item.url === source.url) === index)
        .slice(0, 6);
      if (!sources.length) {
        await writeSystemLog({ userId, level: "warning", module: "ai", action: "gemini_web_search_uncited", message: "Gemini nao retornou fontes verificaveis para a pesquisa web.", metadata: { reason: "grounding_sources_missing" } });
        return null;
      }
      runtimeStatus = "configured";
      return { text, sources, queries: Array.isArray(grounding?.webSearchQueries) ? grounding.webSearchQueries.map(String).slice(0, 5) : [] as string[] };
    } catch (error) {
      runtimeStatus = classifyGeminiError(error);
      await writeSystemLog({ userId, level: "warning", module: "ai", action: "gemini_web_search_failed", message: "Busca na web pelo Gemini falhou; resposta seguirá pelo provedor de IA disponível.", metadata: { reason: runtimeStatus } });
      return null;
    }
  }
};
