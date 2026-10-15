import { api } from "./api";

export type JarvisVoiceSettings = {
  preset: "jarvis-br-premium" | "custom";
  voiceURI: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  spokenRepliesEnabled: boolean;
};

const storageKey = "jarvis_voice_settings";
type RemoteTtsProvider = "auto" | "browser" | "speechma" | "elevenlabs" | "fish_audio" | "none";
let remoteProviderCache: { provider: RemoteTtsProvider; expiresAt: number } | null = null;
let activeAudio: HTMLAudioElement | null = null;
let speechGeneration = 0;

if (typeof window !== "undefined") window.addEventListener("jarvis-tts-config-updated", () => { remoteProviderCache = null; });

export const jarvisVoicePreset: JarvisVoiceSettings = {
  preset: "jarvis-br-premium",
  voiceURI: "",
  lang: "pt-BR",
  rate: 0.92,
  pitch: 0.82,
  volume: 1,
  spokenRepliesEnabled: true
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSettings(settings: Partial<JarvisVoiceSettings> = {}): JarvisVoiceSettings {
  return {
    ...jarvisVoicePreset,
    ...settings,
    rate: clamp(Number(settings.rate ?? jarvisVoicePreset.rate), 0.6, 1.4),
    pitch: clamp(Number(settings.pitch ?? jarvisVoicePreset.pitch), 0.5, 1.5),
    volume: clamp(Number(settings.volume ?? jarvisVoicePreset.volume), 0, 1),
    spokenRepliesEnabled: settings.spokenRepliesEnabled ?? jarvisVoicePreset.spokenRepliesEnabled
  };
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

const masculineVoiceName = /\b(?:male|mascul|homem|antonio|daniel|bruno|carlos|felipe|ricardo|thiago|tiago|rafael|luiz|lucas|paulo|pedro|arthur|david|george|ryan|caio|andre|vitor|guilherme|marcos|mateus|matheus|roberto|eduardo|thomas|david|alexander)\b/i;

export function isMasculineJarvisVoice(voice: Pick<SpeechSynthesisVoice, "name" | "voiceURI"> | null | undefined): boolean {
  if (!voice) return false;
  const searchableName = `${voice.name} ${voice.voiceURI}`.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return masculineVoiceName.test(searchableName);
}

export function selectBestJarvisVoice(voices = getAvailableVoices()) {
  const masculine = voices.filter(isMasculineJarvisVoice);
  return masculine.find((voice) => /^pt-BR$/i.test(voice.lang))
    || masculine.find((voice) => /^pt(?:-|$)/i.test(voice.lang))
    || masculine[0]
    || null;
}

export function resolveJarvisVoice(voices: SpeechSynthesisVoice[], preferredVoiceURI: string) {
  const savedVoice = voices.find((voice) => voice.voiceURI === preferredVoiceURI);
  return isMasculineJarvisVoice(savedVoice) ? savedVoice : selectBestJarvisVoice(voices);
}

export function loadVoiceSettings(): JarvisVoiceSettings {
  if (typeof window === "undefined") return jarvisVoicePreset;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return normalizeSettings(stored ? JSON.parse(stored) : jarvisVoicePreset);
  } catch {
    return jarvisVoicePreset;
  }
}

export function saveVoiceSettings(settings: Partial<JarvisVoiceSettings>) {
  const normalized = normalizeSettings(settings);
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  return normalized;
}

export function stopSpeaking() {
  speechGeneration += 1;
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  if (activeAudio) { activeAudio.pause(); activeAudio.src = ""; activeAudio = null; }
}

function speakWithBrowser(text: string, settings: JarvisVoiceSettings, options: { onStart?: () => void; onEnd?: () => void; onError?: () => void } = {}, generation = speechGeneration) {
  if (typeof window === "undefined" || !window.speechSynthesis) { options.onError?.(); return false; }
  let finished = false;
  const finish = () => {
    if (finished || generation !== speechGeneration) return;
    finished = true;
    options.onEnd?.();
  };
  const fail = () => {
    if (finished || generation !== speechGeneration) return;
    finished = true;
    options.onError?.();
  };
  const utterance = new SpeechSynthesisUtterance(text.trim());
  const voices = getAvailableVoices();
  const selected = resolveJarvisVoice(voices, settings.voiceURI);
  if (!selected) return false;
  if (selected) { utterance.voice = selected; utterance.lang = selected.lang || settings.lang; }
  else utterance.lang = settings.lang;
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = finish;
  utterance.onerror = fail;
  window.speechSynthesis.speak(utterance);
  return true;
}

async function getRemoteProvider(): Promise<RemoteTtsProvider> {
  if (remoteProviderCache && remoteProviderCache.expiresAt > Date.now()) return remoteProviderCache.provider;
  try {
    const result = await api.get("/voice/tts/status");
    const provider = result.data?.status === "configured" ? result.data.provider as RemoteTtsProvider : "none";
    remoteProviderCache = { provider, expiresAt: Date.now() + 60_000 };
    return provider;
  } catch { return "none"; }
}

export async function speakJarvis(text: string, override?: Partial<JarvisVoiceSettings>, options: { onStart?: () => void; onEnd?: () => void; onError?: () => void } = {}) {
  if (typeof window === "undefined" || !text.trim()) return false;
  const settings = normalizeSettings({ ...loadVoiceSettings(), ...override });
  if (!settings.spokenRepliesEnabled) return false;
  stopSpeaking();
  const generation = speechGeneration;
  const provider = await getRemoteProvider();
  if (generation !== speechGeneration) return false;
  if (provider !== "browser" && provider !== "none") {
    try {
      const response = await api.post("/voice/speech", { text: text.trim().slice(0, 5000) }, { responseType: "blob" });
      if (generation !== speechGeneration) return false;
      if (!response.data || response.data.size === 0) throw new Error("O provedor não retornou áudio.");
      const url = URL.createObjectURL(response.data);
      const player = new Audio(url);
      activeAudio = player;
      let finished = false;
      const finish = () => {
        URL.revokeObjectURL(url);
        if (activeAudio === player) activeAudio = null;
        if (!finished && generation === speechGeneration) { finished = true; options.onEnd?.(); }
      };
      const fail = () => {
        URL.revokeObjectURL(url);
        if (activeAudio === player) activeAudio = null;
        if (!finished && generation === speechGeneration) { finished = true; options.onError?.(); }
      };
      player.onended = finish;
      player.onerror = fail;
      await player.play();
      options.onStart?.();
      return true;
    } catch {
      remoteProviderCache = null;
      options.onError?.();
      return false;
    }
  }
  if (provider === "browser") return speakWithBrowser(text, settings, options, generation);
  return false;
}

export type VoiceTestResult = "completed" | "unavailable" | "error" | "timeout";

export function testVoice(settings?: Partial<JarvisVoiceSettings>): Promise<VoiceTestResult> {
  if (typeof window === "undefined") return Promise.resolve("unavailable");
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: VoiceTestResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    };
    const timer = window.setTimeout(() => finish("timeout"), 30_000);
    void speakJarvis("Certo. Esta e a voz JARVIS BR Premium, uma voz original do projeto.", settings, {
      onEnd: () => finish("completed"),
      onError: () => finish("error")
    }).then((started) => { if (!started) finish("unavailable"); }).catch(() => finish("error"));
  });
}
