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
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}

export function speakJarvis(text: string, override?: Partial<JarvisVoiceSettings>) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return false;
  const settings = normalizeSettings({ ...loadVoiceSettings(), ...override });
  if (!settings.spokenRepliesEnabled) return false;
  const utterance = new SpeechSynthesisUtterance(text.trim());
  const voices = getAvailableVoices();
  const selected = voices.find((voice) => voice.voiceURI === settings.voiceURI) || selectBestJarvisVoice(voices);
  if (selected) {
    utterance.voice = selected;
    utterance.lang = selected.lang || settings.lang;
  } else {
    utterance.lang = settings.lang;
  }
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;
  stopSpeaking();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function testVoice(settings?: Partial<JarvisVoiceSettings>) {
  return speakJarvis("Certo. Esta e a voz JARVIS BR Premium, uma voz original do projeto.", settings);
}
