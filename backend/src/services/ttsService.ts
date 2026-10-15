import axios from "axios";
import { prisma } from "../prisma/client.js";
import { decryptSettingValue, encryptSettingValue, maskSecret } from "./encryptionService.js";
import { writeSystemLog } from "./systemLogService.js";

export type RemoteTtsProvider = "speechma" | "elevenlabs" | "fish_audio";
export type TtsProvider = "auto" | "browser" | RemoteTtsProvider;
const keys = {
  provider: "tts_provider",
  autoPreferredProvider: "tts_auto_preferred_provider",
  fishAudioApiKey: "tts_fish_audio_api_key",
  fishAudioVoiceId: "tts_fish_audio_voice_id",
  speechmaApiKey: "tts_speechma_api_key",
  speechmaVoiceId: "tts_speechma_voice_id",
  elevenlabsApiKey: "tts_elevenlabs_api_key",
  elevenlabsVoiceId: "tts_elevenlabs_voice_id",
  elevenlabsModelId: "tts_elevenlabs_model_id"
};

function str(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

async function config(userId: string) {
  const rows = await prisma.setting.findMany({ where: { userId, key: { in: Object.values(keys) } } });
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    provider: (str(values[keys.provider]) || "browser") as TtsProvider,
    autoPreferredProvider: (str(values[keys.autoPreferredProvider]) || "fish_audio") as RemoteTtsProvider,
    fishAudioApiKey: str(decryptSettingValue(keys.fishAudioApiKey, values[keys.fishAudioApiKey])),
    fishAudioVoiceId: str(values[keys.fishAudioVoiceId]),
    speechmaApiKey: str(decryptSettingValue(keys.speechmaApiKey, values[keys.speechmaApiKey])),
    speechmaVoiceId: str(values[keys.speechmaVoiceId]),
    elevenlabsApiKey: str(decryptSettingValue(keys.elevenlabsApiKey, values[keys.elevenlabsApiKey])),
    elevenlabsVoiceId: str(values[keys.elevenlabsVoiceId]),
    elevenlabsModelId: str(values[keys.elevenlabsModelId]) || "eleven_multilingual_v2"
  };
}

async function upsert(userId: string, key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { userId_key: { userId, key } },
    update: { value: encryptSettingValue(key, value) as never },
    create: { userId, key, value: encryptSettingValue(key, value) as never }
  });
}

type Quota = { status: "available" | "exhausted" | "unknown" | "not_configured"; remaining: number | null; limit: number | null; used: number | null; message: string };
const unavailable = (message: string): Quota => ({ status: "unknown", remaining: null, limit: null, used: null, message });

async function quotaFor(provider: RemoteTtsProvider, value: Awaited<ReturnType<typeof config>>): Promise<Quota> {
  try {
    if (provider === "speechma") {
      if (!value.speechmaApiKey) return { ...unavailable("Chave não configurada"), status: "not_configured" };
      const response = await axios.get("https://speechma.com/api/v1/usage", { headers: { "X-API-Key": value.speechmaApiKey }, timeout: 12000 });
      const quota = response.data?.quota ?? response.data;
      const remaining = Number(quota?.chars_remaining ?? response.headers["x-chars-remaining"]);
      const limit = Number(quota?.chars_limit);
      const used = Number(quota?.chars_used);
      if (!Number.isFinite(remaining)) return unavailable("A API não informou a cota de caracteres");
      return { status: remaining > 0 ? "available" : "exhausted", remaining, limit: Number.isFinite(limit) ? limit : null, used: Number.isFinite(used) ? used : null, message: str(quota?.plan) || "Cota de caracteres" };
    }
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
    const response = await axios.get("https://api.fish.audio/wallet/self/api-credit", { headers: { Authorization: `Bearer ${value.fishAudioApiKey}` }, timeout: 12000 });
    const credit = Number(response.data?.credit);
    const hasFreeCredit = response.data?.has_free_credit === true;
    if (!Number.isFinite(credit)) return unavailable("A API não informou os créditos");
    const remaining = hasFreeCredit ? null : Math.max(0, credit);
    return { status: hasFreeCredit || credit > 0 ? "available" : "exhausted", remaining, limit: null, used: null, message: hasFreeCredit ? "Crédito gratuito disponível" : "Créditos Fish Audio" };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    return unavailable(status ? `Consulta de cota respondeu HTTP ${status}` : "Não foi possível consultar a cota agora");
  }
}

function hasVoice(provider: RemoteTtsProvider, value: Awaited<ReturnType<typeof config>>) {
  if (provider === "fish_audio") return Boolean(value.fishAudioApiKey && value.fishAudioVoiceId);
  if (provider === "speechma") return Boolean(value.speechmaApiKey && value.speechmaVoiceId);
  return Boolean(value.elevenlabsApiKey && value.elevenlabsVoiceId);
}

async function synthesizeWith(provider: RemoteTtsProvider, value: Awaited<ReturnType<typeof config>>, text: string) {
  if (provider === "speechma") {
    const response = await axios.post("https://speechma.com/api/v1/tts", { text, voice: value.speechmaVoiceId }, {
      headers: { "X-API-Key": value.speechmaApiKey, "Content-Type": "application/json" }, responseType: "arraybuffer", timeout: 45000
    });
    return Buffer.from(response.data);
  }
  if (provider === "fish_audio") {
    const response = await axios.post<ArrayBuffer>("https://api.fish.audio/v1/tts", { text, reference_id: value.fishAudioVoiceId, format: "mp3" }, {
      headers: { Authorization: `Bearer ${value.fishAudioApiKey}`, "Content-Type": "application/json", model: "s2.1-pro-free" },
      responseType: "arraybuffer", timeout: 45000
    });
    return Buffer.from(response.data);
  }
  const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(value.elevenlabsVoiceId)}`, {
    text, model_id: value.elevenlabsModelId, voice_settings: { stability: 0.55, similarity_boost: 0.75 }
  }, { headers: { "xi-api-key": value.elevenlabsApiKey, "Content-Type": "application/json", Accept: "audio/mpeg" }, responseType: "arraybuffer", timeout: 45000 });
  return Buffer.from(response.data);
}

export const ttsService = {
  async status(userId: string) {
    const value = await config(userId);
    const fishAudioConfigured = hasVoice("fish_audio", value);
    const speechmaConfigured = hasVoice("speechma", value);
    const elevenlabsConfigured = hasVoice("elevenlabs", value);
    const anyRemoteConfigured = fishAudioConfigured || speechmaConfigured || elevenlabsConfigured;
    return {
      provider: value.provider,
      autoPreferredProvider: value.autoPreferredProvider,
      status: value.provider === "browser" || (value.provider === "auto" ? anyRemoteConfigured : hasVoice(value.provider, value)) ? "configured" : "not_configured",
      fishAudio: { configured: fishAudioConfigured, apiKeyConfigured: Boolean(value.fishAudioApiKey), apiKeyMasked: value.fishAudioApiKey ? maskSecret(value.fishAudioApiKey) : "", voiceId: value.fishAudioVoiceId },
      speechma: { configured: speechmaConfigured, apiKeyConfigured: Boolean(value.speechmaApiKey), apiKeyMasked: value.speechmaApiKey ? maskSecret(value.speechmaApiKey) : "", voiceId: value.speechmaVoiceId },
      elevenlabs: { configured: elevenlabsConfigured, apiKeyConfigured: Boolean(value.elevenlabsApiKey), apiKeyMasked: value.elevenlabsApiKey ? maskSecret(value.elevenlabsApiKey) : "", voiceId: value.elevenlabsVoiceId, modelId: value.elevenlabsModelId }
    };
  },

  async quotas(userId: string) {
    const value = await config(userId);
    const providers = ["fish_audio", "elevenlabs", "speechma"] as const;
    const entries = await Promise.all(providers.map(async (provider) => [provider, await quotaFor(provider, value)] as const));
    return { checkedAt: new Date().toISOString(), providers: Object.fromEntries(entries) };
  },

  async save(userId: string, input: Record<string, unknown>) {
    const provider = str(input.provider) as TtsProvider;
    if (!["auto", "browser", "speechma", "elevenlabs", "fish_audio"].includes(provider)) throw new Error("Provedor de voz inválido.");
    const current = await config(userId);
    const preferred = (str(input.autoPreferredProvider) || current.autoPreferredProvider) as RemoteTtsProvider;
    if (!["speechma", "elevenlabs", "fish_audio"].includes(preferred)) throw new Error("Provedor prioritário inválido.");
    const entries: Array<[string, unknown]> = [[keys.provider, provider], [keys.autoPreferredProvider, preferred]];
    const fishAudioApiKey = str(input.fishAudioApiKey);
    if (fishAudioApiKey) entries.push([keys.fishAudioApiKey, fishAudioApiKey]);
    entries.push([keys.fishAudioVoiceId, str(input.fishAudioVoiceId) || current.fishAudioVoiceId]);
    const speechmaApiKey = str(input.speechmaApiKey);
    const elevenlabsApiKey = str(input.elevenlabsApiKey);
    if (speechmaApiKey) entries.push([keys.speechmaApiKey, speechmaApiKey]);
    if (elevenlabsApiKey) entries.push([keys.elevenlabsApiKey, elevenlabsApiKey]);
    entries.push([keys.speechmaVoiceId, str(input.speechmaVoiceId) || current.speechmaVoiceId]);
    entries.push([keys.elevenlabsVoiceId, str(input.elevenlabsVoiceId) || current.elevenlabsVoiceId]);
    entries.push([keys.elevenlabsModelId, str(input.elevenlabsModelId) || current.elevenlabsModelId]);
    await Promise.all(entries.map(([key, value]) => upsert(userId, key, value)));
    await writeSystemLog({ userId, module: "integrations", action: "tts_settings_saved", message: "Configuração de síntese de voz atualizada.", metadata: { provider } });
    return this.status(userId);
  },

  async voices(userId: string, provider: "speechma" | "elevenlabs") {
    const value = await config(userId);
    const apiKey = provider === "speechma" ? value.speechmaApiKey : value.elevenlabsApiKey;
    if (!apiKey) return { status: "not_configured", voices: [] };
    try {
      const response = provider === "speechma"
        ? await axios.get("https://speechma.com/api/v1/voices", { headers: { "X-API-Key": apiKey }, timeout: 15000 })
        : await axios.get("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey }, timeout: 15000 });
      const raw = provider === "speechma" ? (response.data?.voices ?? response.data) : response.data?.voices;
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
    const order: RemoteTtsProvider[] = value.provider === "auto"
      ? [value.autoPreferredProvider, ...(["fish_audio", "elevenlabs", "speechma"] as RemoteTtsProvider[]).filter((item) => item !== value.autoPreferredProvider)]
      : [value.provider];
    const quotaByProvider = value.provider === "auto"
      ? new Map(await Promise.all(order.map(async (provider) => [provider, await quotaFor(provider, value)] as const)))
      : new Map<RemoteTtsProvider, Quota>();
    const failed: string[] = [];
    for (const provider of order) {
      if (!hasVoice(provider, value)) {
        failed.push(`${provider}: voz/chave não configurada`);
        continue;
      }
      if (value.provider === "auto") {
        const quota = quotaByProvider.get(provider)!;
        if (quota.status === "exhausted" || (quota.remaining !== null && quota.remaining < text.length)) {
          failed.push(`${provider}: cota insuficiente para esta fala`);
          continue;
        }
      }
      try {
        const audio = await synthesizeWith(provider, value, text);
        return { status: "success" as const, audio, provider };
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
