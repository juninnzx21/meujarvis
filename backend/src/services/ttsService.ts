import axios from "axios";
import { prisma } from "../prisma/client.js";
import { decryptSettingValue, encryptSettingValue, maskSecret } from "./encryptionService.js";
import { writeSystemLog } from "./systemLogService.js";
import { canUseTtsProvider, parseFishAudioQuota, type TtsQuota } from "./ttsQuota.js";
import { env } from "../config/env.js";
import { checkPiperHealth, synthesizeWithPiper } from "./piperTtsClient.js";
import { getAiProviderConfig } from "./aiProviderConfigService.js";
import { getNvidiaZeroSpendStatus, persistNvidiaZeroSpendPolicy, recordNvidiaZeroSpendBlock } from "./nvidiaBillingPolicyService.js";

export const NVIDIA_MAGPIE_TTS_VOICES = ["Magpie-Multilingual.PT-BR.Diego", "Magpie-Multilingual.PT-BR.Louise", "Magpie-Multilingual.PT-BR.Isabela"] as const;
export type RemoteTtsProvider = "elevenlabs" | "fish_audio" | "nvidia";
export type TtsProvider = "auto" | "browser" | "piper" | RemoteTtsProvider;
const keys = {
  provider: "tts_provider",
  autoPreferredProvider: "tts_auto_preferred_provider",
  allowElevenLabsFallback: "tts_allow_elevenlabs_fallback",
  fishAudioApiKey: "tts_fish_audio_api_key",
  fishAudioVoiceId: "tts_fish_audio_voice_id",
  elevenlabsApiKey: "tts_elevenlabs_api_key",
  elevenlabsVoiceId: "tts_elevenlabs_voice_id",
  elevenlabsModelId: "tts_elevenlabs_model_id",
  elevenlabsStability: "tts_elevenlabs_stability",
  elevenlabsSimilarity: "tts_elevenlabs_similarity",
  elevenlabsStyle: "tts_elevenlabs_style",
  elevenlabsSpeed: "tts_elevenlabs_speed",
  nvidiaVoiceId: "tts_nvidia_voice_id"
};

function str(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

async function config(userId: string) {
  const rows = await prisma.setting.findMany({ where: { userId, key: { in: Object.values(keys) } } });
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    provider: (str(values[keys.provider]) === "browser" ? "auto" : str(values[keys.provider]) || "auto") as TtsProvider,
    autoPreferredProvider: (str(values[keys.autoPreferredProvider]) || "fish_audio") as RemoteTtsProvider,
    allowElevenLabsFallback: values[keys.allowElevenLabsFallback] === true || str(values[keys.allowElevenLabsFallback]) === "true",
    fishAudioApiKey: str(decryptSettingValue(keys.fishAudioApiKey, values[keys.fishAudioApiKey])),
    fishAudioVoiceId: str(values[keys.fishAudioVoiceId]),
    elevenlabsApiKey: str(decryptSettingValue(keys.elevenlabsApiKey, values[keys.elevenlabsApiKey])),
    elevenlabsVoiceId: str(values[keys.elevenlabsVoiceId]),
    elevenlabsModelId: str(values[keys.elevenlabsModelId]) || "eleven_multilingual_v2",
    elevenlabsStability: boundedNumber(values[keys.elevenlabsStability], 0.42, 0, 1),
    elevenlabsSimilarity: boundedNumber(values[keys.elevenlabsSimilarity], 0.82, 0, 1),
    elevenlabsStyle: boundedNumber(values[keys.elevenlabsStyle], 0.18, 0, 1),
    elevenlabsSpeed: boundedNumber(values[keys.elevenlabsSpeed], 0.94, 0.7, 1.2),
    nvidiaVoiceId: str(values[keys.nvidiaVoiceId]) || NVIDIA_MAGPIE_TTS_VOICES[0]
  };
}

async function upsert(userId: string, key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { userId_key: { userId, key } },
    update: { value: encryptSettingValue(key, value) as never },
    create: { userId, key, value: encryptSettingValue(key, value) as never }
  });
}

type Quota = TtsQuota;
const unavailable = (message: string): Quota => ({ status: "unknown", remaining: null, limit: null, used: null, message });

async function quotaFor(provider: RemoteTtsProvider, value: Awaited<ReturnType<typeof config>>): Promise<Quota> {
  try {
    if (provider === "nvidia") return { ...unavailable("NVIDIA_ZERO_SPEND: orçamento R$ 0,00; uso bloqueado até comprovação confiável de quota, preço e entitlement sem cobrança"), status: "unknown" };
    if (provider === "elevenlabs") {
      if (!value.elevenlabsApiKey) return { ...unavailable("Chave não configurada"), status: "not_configured" };
      const response = await axios.get("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": value.elevenlabsApiKey }, timeout: 12000 });
      const used = Number(response.data?.character_count);
      const limit = Number(response.data?.character_limit);
      if (!Number.isFinite(used) || !Number.isFinite(limit)) return unavailable("A API não informou o uso da cota");
      const remaining = Math.max(0, limit - used);
      return { status: remaining > 0 ? "available" : "exhausted", remaining, limit, used, message: str(response.data?.tier) || "Cota de caracteres" };
    }
    if (!value.fishAudioApiKey) return { ...unavailable("Chave não configurada"), status: "not_configured" };
    const response = await axios.get("https://api.fish.audio/wallet/self/api-credit", {
      params: { check_free_credit: true },
      headers: { Authorization: `Bearer ${value.fishAudioApiKey}` },
      timeout: 12000
    });
    return parseFishAudioQuota(response.data);
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    return unavailable(status ? `Consulta de cota respondeu HTTP ${status}` : "Não foi possível consultar a cota agora");
  }
}

function hasVoice(provider: RemoteTtsProvider, value: Awaited<ReturnType<typeof config>>) {
  if (provider === "fish_audio") return Boolean(value.fishAudioApiKey && value.fishAudioVoiceId);
  if (provider === "nvidia") return true;
  return Boolean(value.elevenlabsApiKey && value.elevenlabsVoiceId);
}

async function synthesizeWith(provider: RemoteTtsProvider, value: Awaited<ReturnType<typeof config>>, text: string, userId: string) {
  if (provider === "nvidia") {
    await recordNvidiaZeroSpendBlock(userId, "tts", "magpie-tts-multilingual");
    throw new Error("NVIDIA TTS bloqueado pela política NVIDIA_ZERO_SPEND; nenhum texto foi enviado ao provedor.");
  }
  if (provider === "fish_audio") {
    const response = await axios.post<ArrayBuffer>("https://api.fish.audio/v1/tts", { text, reference_id: value.fishAudioVoiceId, format: "mp3" }, {
      headers: { Authorization: `Bearer ${value.fishAudioApiKey}`, "Content-Type": "application/json", model: "s2.1-pro-free" },
      responseType: "arraybuffer", timeout: 45000
    });
    return Buffer.from(response.data);
  }
  const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(value.elevenlabsVoiceId)}`, {
    text, model_id: value.elevenlabsModelId, voice_settings: {
      stability: value.elevenlabsStability,
      similarity_boost: value.elevenlabsSimilarity,
      style: value.elevenlabsStyle,
      speed: value.elevenlabsSpeed,
      use_speaker_boost: true
    }
  }, { headers: { "xi-api-key": value.elevenlabsApiKey, "Content-Type": "application/json", Accept: "audio/mpeg" }, responseType: "arraybuffer", timeout: 45000 });
  return Buffer.from(response.data);
}

export const ttsService = {
  async status(userId: string) {
    const value = await config(userId);
    const piperHealth = await checkPiperHealth(env.PIPER_TTS_URL);
    const fishAudioConfigured = hasVoice("fish_audio", value);
    const elevenlabsConfigured = hasVoice("elevenlabs", value);
    const nvidia = await getAiProviderConfig("nvidia", userId, { allowEnvironmentFallback: false });
    const nvidiaBilling = await getNvidiaZeroSpendStatus(userId);
    const nvidiaConfigured = nvidia.configured;
    const anyConfigured = piperHealth.status === "available" || fishAudioConfigured || elevenlabsConfigured;
    const selectedConfigured = value.provider === "piper" ? piperHealth.status === "available" : value.provider === "browser" ? true : value.provider === "auto" ? anyConfigured : value.provider === "nvidia" ? false : hasVoice(value.provider, value);
    return {
      provider: value.provider,
      autoPreferredProvider: value.autoPreferredProvider,
      allowElevenLabsFallback: value.allowElevenLabsFallback,
      nvidiaVoiceId: value.nvidiaVoiceId,
      status: selectedConfigured ? "configured" : "not_configured",
      piper: { status: piperHealth.status, configured: piperHealth.status === "available", model: piperHealth.model ?? "pt_BR-cadu-medium", latencyMs: piperHealth.latencyMs ?? null, endpointConfigured: Boolean(env.PIPER_TTS_URL) },
      fishAudio: { configured: fishAudioConfigured, apiKeyConfigured: Boolean(value.fishAudioApiKey), apiKeyMasked: value.fishAudioApiKey ? maskSecret(value.fishAudioApiKey) : "", voiceId: value.fishAudioVoiceId },
      elevenlabs: {
        configured: elevenlabsConfigured,
        apiKeyConfigured: Boolean(value.elevenlabsApiKey),
        apiKeyMasked: value.elevenlabsApiKey ? maskSecret(value.elevenlabsApiKey) : "",
        voiceId: value.elevenlabsVoiceId,
        modelId: value.elevenlabsModelId,
        stability: value.elevenlabsStability,
        similarity: value.elevenlabsSimilarity,
        style: value.elevenlabsStyle,
        speed: value.elevenlabsSpeed
      },
      nvidia: { configured: nvidiaConfigured, keyConfigured: nvidiaConfigured, model: "magpie-tts-multilingual", voiceId: value.nvidiaVoiceId, language: "pt-BR", quota: "unknown", billing: nvidiaBilling, blocked: true }
    };
  },

  async quotas(userId: string) {
    const value = await config(userId);
    const providers = ["fish_audio", "elevenlabs", "nvidia"] as const;
    const entries = await Promise.all(providers.map(async (provider) => [provider, await quotaFor(provider, value)] as const));
    return { checkedAt: new Date().toISOString(), providers: Object.fromEntries(entries), local: { piper: await checkPiperHealth(env.PIPER_TTS_URL) } };
  },

  async save(userId: string, input: Record<string, unknown>) {
    const provider = str(input.provider) as TtsProvider;
    if (!["auto", "browser", "piper", "elevenlabs", "fish_audio", "nvidia"].includes(provider)) throw new Error("Provedor de voz inválido.");
    const current = await config(userId);
    const preferred = (str(input.autoPreferredProvider) || current.autoPreferredProvider) as RemoteTtsProvider;
    if (!["elevenlabs", "fish_audio", "nvidia"].includes(preferred)) throw new Error("Provedor prioritário inválido.");
    const entries: Array<[string, unknown]> = [[keys.provider, provider], [keys.autoPreferredProvider, preferred], [keys.allowElevenLabsFallback, input.allowElevenLabsFallback === true]];
    const fishAudioApiKey = str(input.fishAudioApiKey);
    if (fishAudioApiKey) entries.push([keys.fishAudioApiKey, fishAudioApiKey]);
    entries.push([keys.fishAudioVoiceId, str(input.fishAudioVoiceId) || current.fishAudioVoiceId]);
    const elevenlabsApiKey = str(input.elevenlabsApiKey);
    if (elevenlabsApiKey) entries.push([keys.elevenlabsApiKey, elevenlabsApiKey]);
    entries.push([keys.elevenlabsVoiceId, str(input.elevenlabsVoiceId) || current.elevenlabsVoiceId]);
    entries.push([keys.elevenlabsModelId, str(input.elevenlabsModelId) || current.elevenlabsModelId]);
    entries.push([keys.elevenlabsStability, boundedNumber(input.elevenlabsStability, current.elevenlabsStability, 0, 1)]);
    entries.push([keys.elevenlabsSimilarity, boundedNumber(input.elevenlabsSimilarity, current.elevenlabsSimilarity, 0, 1)]);
    entries.push([keys.elevenlabsStyle, boundedNumber(input.elevenlabsStyle, current.elevenlabsStyle, 0, 1)]);
    entries.push([keys.elevenlabsSpeed, boundedNumber(input.elevenlabsSpeed, current.elevenlabsSpeed, 0.7, 1.2)]);
    const nvidiaVoiceId = str(input.nvidiaVoiceId) || current.nvidiaVoiceId;
    if (!NVIDIA_MAGPIE_TTS_VOICES.includes(nvidiaVoiceId as typeof NVIDIA_MAGPIE_TTS_VOICES[number])) throw new Error("Selecione uma voz Magpie PT-BR do catálogo.");
    entries.push([keys.nvidiaVoiceId, nvidiaVoiceId]);
    await prisma.$transaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx.setting.upsert({
          where: { userId_key: { userId, key } },
          update: { value: encryptSettingValue(key, value) as never },
          create: { userId, key, value: encryptSettingValue(key, value) as never }
        });
      }
      if (provider === "nvidia" || preferred === "nvidia") await persistNvidiaZeroSpendPolicy(tx, userId);
    });
    await writeSystemLog({ userId, module: "integrations", action: "tts_settings_saved", message: "Configuração de síntese de voz atualizada.", metadata: { provider } });
    return this.status(userId);
  },

  async voices(userId: string, provider: "elevenlabs" | "nvidia") {
    if (provider === "nvidia") return { status: "success", voices: NVIDIA_MAGPIE_TTS_VOICES.map((id) => ({ id, name: id, language: "pt-BR", gender: id.endsWith("Diego") ? "masculina" : "feminina" })) };
    const value = await config(userId);
    const apiKey = value.elevenlabsApiKey;
    if (!apiKey) return { status: "not_configured", voices: [] };
    try {
      const response = await axios.get("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey }, timeout: 15000 });
      const raw = response.data?.voices;
      const voices = Array.isArray(raw) ? raw.map((voice: Record<string, unknown>) => ({
        id: str(voice.voice_id ?? voice.id), name: str(voice.name) || str(voice.voice_id ?? voice.id),
        language: str(voice.language ?? voice.locale ?? voice.language_code),
        gender: str(voice.gender ?? (voice.labels as Record<string, unknown> | undefined)?.gender)
      })).filter((voice: { id: string }) => voice.id) : [];
      return { status: "success", voices };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      await writeSystemLog({ userId, module: "integrations", action: "tts_voice_list_failed", level: "error", message: `Falha ao listar vozes ${provider}.`, metadata: { provider, httpStatus: status } });
      return { status: "error", voices: [], message: status ? `O provedor respondeu HTTP ${status}.` : "Não foi possível consultar o provedor." };
    }
  },

  async cloneFishAudioVoice(userId: string, audio: Buffer, contentType: string, title = "JARVIS - Voz personalizada") {
    if (!audio.length || audio.length > 8 * 1024 * 1024) throw new Error("O áudio deve ter até 8 MB.");
    if (contentType !== "audio/mpeg") throw new Error("Envie um arquivo MP3 válido.");
    const value = await config(userId);
    if (!value.fishAudioApiKey) throw new Error("Configure e salve a chave Fish Audio antes de clonar a voz.");
    const form = new FormData();
    form.set("title", title.slice(0, 80));
    form.set("type", "tts");
    form.set("train_mode", "fast");
    form.set("visibility", "private");
    form.set("enhance_audio_quality", "true");
    const audioBytes = new Uint8Array(audio.length);
    audioBytes.set(audio);
    form.set("voices", new Blob([audioBytes.buffer], { type: contentType }), "jarvis-reference.mp3");
    try {
      const response = await axios.post<{ _id?: string; id?: string }>("https://api.fish.audio/model", form, {
        headers: { Authorization: `Bearer ${value.fishAudioApiKey}` },
        timeout: 120000,
        maxBodyLength: 9 * 1024 * 1024,
        maxContentLength: 2 * 1024 * 1024
      });
      const voiceId = str(response.data?._id ?? response.data?.id);
      if (!voiceId) throw new Error("A Fish Audio não retornou o identificador da voz.");
      await Promise.all([
        upsert(userId, keys.fishAudioVoiceId, voiceId),
        upsert(userId, keys.provider, "fish_audio")
      ]);
      await writeSystemLog({ userId, module: "integrations", action: "fish_audio_voice_cloned", message: "Voz personalizada criada como modelo privado na Fish Audio.", metadata: { audioBytes: audio.length, visibility: "private" } });
      return { status: "success" as const, voiceId };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      await writeSystemLog({ userId, module: "integrations", action: "fish_audio_voice_clone_failed", level: "error", message: "Falha ao criar a voz personalizada Fish Audio.", metadata: { httpStatus: status ?? null } });
      if (error instanceof Error && !axios.isAxiosError(error)) throw error;
      throw new Error(status ? `Fish Audio respondeu HTTP ${status}; verifique a chave, o arquivo e os limites da conta.` : "Não foi possível criar a voz na Fish Audio.");
    }
  },

  async synthesize(userId: string, text: string) {
    if (!text.trim() || text.length > 5000) throw new Error("O texto deve ter entre 1 e 5.000 caracteres.");
    const value = await config(userId);
    if (value.provider === "browser") return { status: "browser" as const };
    if (value.provider === "nvidia") {
      await recordNvidiaZeroSpendBlock(userId, "tts", "magpie-tts-multilingual");
      throw new Error("NVIDIA TTS bloqueado: orçamento autorizado de R$ 0,00 e cobrança não verificada.");
    }
    const remoteOrder = [value.autoPreferredProvider, ...(["fish_audio", "elevenlabs"] as RemoteTtsProvider[]).filter((item) => item !== value.autoPreferredProvider)]
      .filter((item, index) => index === 0 || item !== "elevenlabs" || value.allowElevenLabsFallback);
    const order: Array<"piper" | RemoteTtsProvider> = value.provider === "auto"
      ? value.autoPreferredProvider === "nvidia" ? ["piper"] : ["piper", ...remoteOrder]
      : [value.provider as "piper" | RemoteTtsProvider];
    const quotaProviders = order.filter((provider): provider is RemoteTtsProvider => provider !== "piper");
    const quotaByProvider = value.provider === "auto"
      ? new Map(await Promise.all(quotaProviders.map(async (provider) => [provider, await quotaFor(provider, value)] as const)))
      : new Map<RemoteTtsProvider, Quota>();
    const failed: string[] = [];
    for (const provider of order) {
      if (provider === "piper") {
        try {
          const audio = await synthesizeWithPiper(text, env.PIPER_TTS_URL);
          return { status: "success" as const, audio, provider, contentType: "audio/wav" as const };
        } catch (error) {
          failed.push(`piper: ${error instanceof Error ? error.message : "falha de transporte"}`);
          await writeSystemLog({ userId, module: "integrations", action: "tts_synthesis_failed", level: "error", message: "Falha na síntese local de voz; texto não foi registrado.", metadata: { provider, automaticFallback: value.provider === "auto" } });
          if (value.provider !== "auto") throw error;
          continue;
        }
      }
      if (!hasVoice(provider, value)) {
        failed.push(`${provider}: voz/chave não configurada`);
        continue;
      }
      if (value.provider === "auto") {
        const quota = quotaByProvider.get(provider)!;
        if (!canUseTtsProvider(quota, text.length)) {
          failed.push(`${provider}: ${quota.status === "unknown" ? "cota não confirmada" : "cota insuficiente para esta fala"}`);
          continue;
        }
      }
      try {
        const audio = await synthesizeWith(provider, value, text, userId);
        return { status: "success" as const, audio, provider, contentType: provider === "nvidia" ? "audio/wav" as const : "audio/mpeg" as const };
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        failed.push(`${provider}: ${status ? `HTTP ${status}` : "falha de transporte"}`);
        await writeSystemLog({ userId, module: "integrations", action: "tts_synthesis_failed", level: "error", message: "Falha na síntese de voz; credenciais e texto não foram registrados.", metadata: { provider, httpStatus: status ?? null, automaticFallback: value.provider === "auto" } });
        const rejectedWithoutSynthesis = status !== undefined && [400, 401, 402, 403, 404, 422, 429].includes(status);
        if (value.provider !== "auto" || !rejectedWithoutSynthesis) throw error;
      }
    }
    await writeSystemLog({ userId, module: "integrations", action: "tts_all_providers_unavailable", level: "error", message: "Nenhum provedor de voz configurado conseguiu gerar áudio.", metadata: { providersTried: order.length } });
    throw new Error(`Não foi possível gerar a voz do JARVIS. Verifique as chaves, as vozes e as cotas. ${failed.join("; ")}`);
  },

  async test(userId: string) {
    const value = await config(userId);
    const result = await this.synthesize(userId, "Teste de voz do JARVIS. A configuração de áudio está funcionando.");
    if (result.status === "browser") return { status: "not_configured", message: "Selecione um provedor remoto para testar a API." };
    return { status: "success", provider: result.provider, audioBytes: result.audio.length };
  }
};
