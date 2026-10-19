import { prisma } from "../prisma/client.js";
import { normalizePrivateOllamaUrl } from "./ollamaUrl.js";
import { getNvidiaZeroSpendStatus, persistNvidiaZeroSpendPolicy, recordNvidiaZeroSpendBlock } from "./nvidiaBillingPolicyService.js";

const BASE_URL_KEY = "nvidia_stt_base_url";
const PROVIDER_KEY = "stt_provider";
const FALLBACK_KEY = "stt_fallback_to_openai";
type SpeechFile = { buffer: Buffer; filename?: string; mimeType?: string };

async function settings(userId: string) {
  const rows = await prisma.setting.findMany({ where: { userId, key: { in: [BASE_URL_KEY, PROVIDER_KEY, FALLBACK_KEY] } }, select: { key: true, value: true } });
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  return {
    baseUrl: typeof values[BASE_URL_KEY] === "string" ? values[BASE_URL_KEY] as string : "",
    provider: values[PROVIDER_KEY] === "nvidia" ? "nvidia" : "openai",
    fallbackToOpenAi: values[PROVIDER_KEY] === "nvidia" ? false : values[FALLBACK_KEY] === true || values[FALLBACK_KEY] === "true"
  };
}

export const nvidiaSpeechService = {
  async status(userId: string) {
    const config = await settings(userId);
    const billing = await getNvidiaZeroSpendStatus(userId);
    return { provider: config.provider, configured: Boolean(config.baseUrl), baseUrl: config.baseUrl, fallbackToOpenAi: false, model: "Whisper Large V3 / NVIDIA Speech NIM HTTP", language: "pt-BR", protocol: "NIM HTTP multipart; self-hosted endpoint", billing, inferenceEnabled: false };
  },
  async save(userId: string, input: Record<string, unknown>) {
    const baseUrlInput = typeof input.baseUrl === "string" ? input.baseUrl.trim() : "";
    let baseUrl = "";
    try { baseUrl = normalizePrivateOllamaUrl(baseUrlInput); }
    catch (error) { throw Object.assign(new Error(error instanceof Error ? error.message.replace("Ollama", "NVIDIA Speech NIM") : "URL privada inválida."), { statusCode: 400 }); }
    const provider = input.provider === "nvidia" ? "nvidia" : "openai";
    await prisma.$transaction(async (tx) => {
      await tx.setting.upsert({ where: { userId_key: { userId, key: BASE_URL_KEY } }, update: { value: baseUrl }, create: { userId, key: BASE_URL_KEY, value: baseUrl } });
      await tx.setting.upsert({ where: { userId_key: { userId, key: PROVIDER_KEY } }, update: { value: provider }, create: { userId, key: PROVIDER_KEY, value: provider } });
      await tx.setting.upsert({ where: { userId_key: { userId, key: FALLBACK_KEY } }, update: { value: false }, create: { userId, key: FALLBACK_KEY, value: false } });
      await persistNvidiaZeroSpendPolicy(tx, userId);
    });
    return this.status(userId);
  },
  async testConnection(userId: string) {
    const { baseUrl } = await settings(userId);
    if (!baseUrl) return { status: "not_configured", message: "Informe a URL privada do NVIDIA Speech NIM." };
    await recordNvidiaZeroSpendBlock(userId, "stt", "whisper-large-v3");
    return { status: "billing_unverified_blocked", message: "Teste de conexão bloqueado pela política NVIDIA_ZERO_SPEND; nenhum endpoint foi consultado.", inferenceEnabled: false };
  },
  async transcribeAudio(input: SpeechFile, userId: string) {
    void input;
    const config = await settings(userId);
    if (config.provider !== "nvidia") return { status: "not_configured" as const, text: "", fallbackToOpenAi: false };
    await recordNvidiaZeroSpendBlock(userId, "stt", "whisper-large-v3");
    return { status: "billing_unverified_blocked" as const, text: "", message: "Transcrição NVIDIA bloqueada: orçamento R$ 0,00 e cobrança/entitlement não verificados.", fallbackToOpenAi: false };
  }
};
