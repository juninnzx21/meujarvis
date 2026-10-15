import OpenAI from "openai";
import { env } from "../config/env.js";
import { getAiPrimaryProvider, getAiProviderConfig } from "./aiProviderConfigService.js";
import { geminiService } from "./geminiService.js";
import { ollamaService } from "./ollamaService.js";
import { writeSystemLog } from "./systemLogService.js";

type OpenAiStatus = "configured" | "missing_key" | "invalid_key" | "quota_exceeded" | "model_not_found" | "network_error" | "api_error";
type OpenAiClient = Pick<OpenAI, "chat" | "audio" | "models">;
let runtimeClient: OpenAiClient | null = null;
let runtimeClientKey = "";
let testClient: OpenAiClient | null | undefined;
let runtimeStatus: OpenAiStatus = env.OPENAI_API_KEY ? "configured" : "missing_key";
let lastErrorMessage = "";
const fallbackReply = "Estou operando em modo seguro local porque os provedores de IA configurados nao responderam agora. As funcoes internas de tarefas, memorias, status e automacoes seguras continuam disponiveis.";

function classifyOpenAiError(error: unknown): OpenAiStatus {
  const candidate = error as { status?: number; code?: string; type?: string; message?: string };
  const message = error instanceof Error ? error.message : String(error);
  const combined = `${candidate.status ?? ""} ${candidate.code ?? ""} ${candidate.type ?? ""} ${message}`;
  if (/401|403|invalid.?api.?key|incorrect.?api.?key|unauthorized|forbidden|authentication/i.test(combined)) return "invalid_key";
  if (/429|quota|billing|exceeded/i.test(combined)) return "quota_exceeded";
  if (/404|model.?not.?found|does not exist|invalid.?model/i.test(combined)) return "model_not_found";
  if (/network|timeout|ECONN|ENOTFOUND|fetch failed/i.test(combined)) return "network_error";
  return "api_error";
}

async function resolveClient(userId?: string, resolvedConfig?: Awaited<ReturnType<typeof getAiProviderConfig>>) {
  if (testClient !== undefined) return testClient;
  const config = resolvedConfig || await getAiProviderConfig("openai", userId);
  if (!config.apiKey) return null;
  if (!runtimeClient || runtimeClientKey !== config.apiKey) {
    runtimeClient = new OpenAI({ apiKey: config.apiKey });
    runtimeClientKey = config.apiKey;
  }
  return runtimeClient;
}

async function completeWithOpenAi(messages: { role: "system" | "user" | "assistant"; content: string }[], userId?: string) {
  const config = await getAiProviderConfig("openai", userId);
  const client = await resolveClient(userId, config);
  if (!client) {
    runtimeStatus = "missing_key";
    return null;
  }

  try {
    const completion = await client.chat.completions.create({ model: config.model, temperature: 0.4, messages });
    runtimeStatus = "configured";
    lastErrorMessage = "";
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    runtimeStatus = classifyOpenAiError(error);
    lastErrorMessage = error instanceof Error ? error.message : String(error);
    await writeSystemLog({ userId, level: "warning", module: "ai", action: "openai_provider_failed", message: "OpenAI indisponivel; o provedor alternativo sera avaliado.", metadata: { reason: runtimeStatus } });
    return null;
  }
}

export const openAiService = {
  get configured() {
    return Boolean(env.OPENAI_API_KEY);
  },
  status() {
    return {
      configured: Boolean(env.OPENAI_API_KEY),
      model: env.OPENAI_MODEL,
      source: env.OPENAI_API_KEY ? "ambiente" : "ausente",
      status: runtimeStatus,
      lastError: lastErrorMessage ? "[REDACTED_DETAIL]" : "",
      fallbackProvider: geminiService.configured ? "gemini" : "local",
      gemini: geminiService.status()
    };
  },
  async statusForUser(userId: string) {
    const [config, gemini] = await Promise.all([
      getAiProviderConfig("openai", userId),
      geminiService.statusForUser(userId)
    ]);
    return {
      configured: config.configured,
      keyConfigured: config.configured,
      source: config.source,
      model: config.model,
      status: config.configured ? runtimeStatus === "missing_key" ? "configured" : runtimeStatus : "missing_key",
      lastError: lastErrorMessage ? "[REDACTED_DETAIL]" : "",
      fallbackProvider: gemini.configured ? "gemini" : "local",
      gemini
    };
  },
  setClientForTests(mockClient: OpenAiClient | null) {
    if (env.NODE_ENV === "production") return;
    testClient = mockClient;
    runtimeStatus = mockClient ? "configured" : "missing_key";
    lastErrorMessage = "";
  },
  async testConnection(userId: string) {
    const config = await getAiProviderConfig("openai", userId);
    if (!config.apiKey) return { status: "not_configured", message: "Configure uma chave da OpenAI antes do teste." };
    try {
      const client = await resolveClient(userId, config);
      if (!client) return { status: "not_configured" };
      await client.models.list();
      runtimeStatus = "configured";
      lastErrorMessage = "";
      return { status: "success", model: config.model };
    } catch (error) {
      runtimeStatus = classifyOpenAiError(error);
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      await writeSystemLog({ userId, level: "warning", module: "ai", action: "openai_connection_test_failed", message: "Teste de conexao OpenAI falhou.", metadata: { reason: runtimeStatus } });
      return { status: runtimeStatus, message: "A OpenAI nao confirmou a conexao. Confira a chave, o modelo e os limites da conta." };
    }
  },
  async transcribeAudio(input: { buffer: Buffer; filename?: string; mimeType?: string }, userId?: string) {
    const client = await resolveClient(userId);
    if (!client) {
      runtimeStatus = "missing_key";
      return { status: "missing_key", text: "", message: "OpenAI nao configurada para transcricao de audio." };
    }
    try {
      const arrayBuffer = input.buffer.buffer.slice(input.buffer.byteOffset, input.buffer.byteOffset + input.buffer.byteLength) as ArrayBuffer;
      const file = new File([arrayBuffer], input.filename || "whatsapp-audio.ogg", {
        type: input.mimeType || "audio/ogg"
      });
      const transcription = await client.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "pt"
      });
      runtimeStatus = "configured";
      lastErrorMessage = "";
      return { status: "success", text: transcription.text?.trim() || "" };
    } catch (error) {
      runtimeStatus = classifyOpenAiError(error);
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      await writeSystemLog({
        userId,
        level: "warning",
        module: "ai",
        action: "audio_transcription_failed",
        message: "Falha ao transcrever audio do WhatsApp.",
        metadata: { reason: runtimeStatus }
      });
      return { status: runtimeStatus, text: "", message: "Nao consegui transcrever o audio agora." };
    }
  },
  async listModelsForUser(userId: string) {
    const config = await getAiProviderConfig("openai", userId);
    if (!config.apiKey) return { status: "not_configured", models: [] as string[], message: "Configure a chave OpenAI antes de carregar os modelos." };
    try {
      const client = await resolveClient(userId, config);
      if (!client) return { status: "not_configured", models: [] as string[] };
      const response = await client.models.list();
      const models = response.data.map((model) => model.id).filter((id) => /^(gpt-|o[134](?:-|$)|chatgpt-)/i.test(id)).sort();
      return { status: "success", models };
    } catch (error) {
      const reason = classifyOpenAiError(error);
      await writeSystemLog({ userId, level: "warning", module: "ai", action: "openai_models_list_failed", message: "Nao foi possivel carregar a lista de modelos OpenAI.", metadata: { reason } });
      return { status: reason, models: [] as string[], message: "Nao foi possivel carregar os modelos. Confira a chave e tente novamente." };
    }
  },
  async complete(messages: { role: "system" | "user" | "assistant"; content: string }[], userId?: string) {
    const primaryProvider = await getAiPrimaryProvider(userId);
    const providers = primaryProvider === "openai"
      ? ["openai", "ollama", "gemini"] as const
      : primaryProvider === "gemini"
        ? ["gemini", "ollama", "openai"] as const
        : primaryProvider === "ollama"
          ? ["ollama", "openai", "gemini"] as const
          : ["ollama", "openai", "gemini"] as const;
    for (const provider of providers) {
      const reply = provider === "gemini"
        ? await geminiService.complete(messages, userId)
        : provider === "ollama"
          ? await ollamaService.complete(messages, userId)
          : await completeWithOpenAi(messages, userId);
      if (reply) return reply;
    }
    return fallbackReply;
  }
};
