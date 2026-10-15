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

export function selectBestJarvisVoice(voices = getAvailableVoices()) {
  const preferred = voices.find((voice) => /pt-BR/i.test(voice.lang) && /male|mascul|homem|brasil/i.test(voice.name));
  const ptBr = voices.find((voice) => /pt-BR/i.test(voice.lang));
  const pt = voices.find((voice) => /^pt/i.test(voice.lang));
  const neutral = voices.find((voice) => /en-GB/i.test(voice.lang) && /male|daniel|george|ryan|arthur/i.test(voice.name));
  return preferred || ptBr || pt || neutral || voices[0] || null;
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

function speakWithBrowser(text: string, settings: JarvisVoiceSettings, onEnd?: () => void, generation = speechGeneration) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  let finished = false;
  const finish = () => {
    if (finished || generation !== speechGeneration) return;
    finished = true;
    onEnd?.();
  };
  const utterance = new SpeechSynthesisUtterance(text.trim());
  const voices = getAvailableVoices();
  const selected = voices.find((voice) => voice.voiceURI === settings.voiceURI) || selectBestJarvisVoice(voices);
  if (selected) { utterance.voice = selected; utterance.lang = selected.lang || settings.lang; }
  else utterance.lang = settings.lang;
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;
  utterance.onend = finish;
  utterance.onerror = finish;
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

export async function speakJarvis(text: string, override?: Partial<JarvisVoiceSettings>, options: { onEnd?: () => void } = {}) {
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
      player.onended = finish;
      player.onerror = finish;
      await player.play();
      return true;
    } catch {
      remoteProviderCache = null;
      return false;
    }
  }
  if (provider === "browser") return speakWithBrowser(text, settings, options.onEnd, generation);
  return false;
}

export function testVoice(settings?: Partial<JarvisVoiceSettings>) {
  return speakJarvis("Certo. Esta e a voz JARVIS BR Premium, uma voz original do projeto.", settings);
}
