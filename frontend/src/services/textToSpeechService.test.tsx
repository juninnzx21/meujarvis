import { beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
vi.mock("./api", () => ({ api: { get: (...args: unknown[]) => apiGet(...args), post: vi.fn() } }));

import { isMasculineJarvisVoice, jarvisVoicePreset, resolveJarvisVoice, saveVoiceSettings, selectBestJarvisVoice, speakJarvis, testVoice } from "./textToSpeechService";

type FakeUtterance = {
  text: string;
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
};

let voices: SpeechSynthesisVoice[];
let utterances: FakeUtterance[];
let browserSpeak: ReturnType<typeof vi.fn>;

describe("selectBestJarvisVoice", () => {
  it("prefers a masculine Brazilian Portuguese voice over a generic Google Brazil voice", () => {
    const voices = [
      { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" },
      { name: "Microsoft Francisca Online (Natural)", lang: "pt-BR", voiceURI: "francisca-pt-br" },
      { name: "Microsoft Antonio Online (Natural)", lang: "pt-BR", voiceURI: "antonio-pt-br" }
    ] as SpeechSynthesisVoice[];

    expect(selectBestJarvisVoice(voices)?.voiceURI).toBe("antonio-pt-br");
  });

  it("prefers a recognizable male voice in another language over Google's generic Brazilian voice", () => {
    const voices = [
      { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" },
      { name: "Microsoft Daniel Online", lang: "en-GB", voiceURI: "daniel-en-gb" }
    ] as SpeechSynthesisVoice[];

    expect(selectBestJarvisVoice(voices)?.voiceURI).toBe("daniel-en-gb");
  });

  it("refuses to silently use Google's female Brazilian voice when no identifiable male voice exists", () => {
    const voices = [
      { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" },
      { name: "Microsoft Francisca Online (Natural)", lang: "pt-BR", voiceURI: "francisca-pt-br" }
    ] as SpeechSynthesisVoice[];

    expect(selectBestJarvisVoice(voices)).toBeNull();
  });

  it("recognizes accented Brazilian masculine voice names", () => {
    expect(isMasculineJarvisVoice({ name: "Microsoft Antônio Online (Natural)", voiceURI: "antonio-pt-br" })).toBe(true);
  });

  it("replaces a saved Google voice with a recognizable male voice", () => {
    const google = { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" } as SpeechSynthesisVoice;
    const antonio = { name: "Microsoft Antonio Online", lang: "pt-BR", voiceURI: "antonio-pt-br" } as SpeechSynthesisVoice;
    expect(resolveJarvisVoice([google, antonio], google.voiceURI)?.voiceURI).toBe(antonio.voiceURI);
  });

  it("returns no voice instead of selecting Google when there is no identifiable male voice", () => {
    const google = { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" } as SpeechSynthesisVoice;
    expect(resolveJarvisVoice([google], google.voiceURI)).toBeNull();
  });
});

describe("browser JARVIS speech validation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    apiGet.mockReset();
    apiGet.mockResolvedValue({ data: { status: "configured", provider: "browser" } });
    window.dispatchEvent(new Event("jarvis-tts-config-updated"));
    voices = [
      { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" },
      { name: "Microsoft Antonio Online (Natural)", lang: "pt-BR", voiceURI: "antonio-pt-br" }
    ] as SpeechSynthesisVoice[];
    utterances = [];
    browserSpeak = vi.fn((utterance: FakeUtterance) => {
      utterances.push(utterance);
      utterance.onstart?.();
      utterance.onend?.();
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { getVoices: () => voices, cancel: vi.fn(), speak: browserSpeak }
    });
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      voice: SpeechSynthesisVoice | null = null;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      onstart?: () => void;
      onend?: () => void;
      onerror?: () => void;
      constructor(public text: string) {}
    });
  });

  it("speaks with the masculine voice and completes the audio test", async () => {
    saveVoiceSettings({ ...jarvisVoicePreset, voiceURI: "google-pt-br" });
    const result = await testVoice();
    expect(result).toBe("completed");
    expect(browserSpeak).toHaveBeenCalledOnce();
    expect(utterances[0]?.voice?.voiceURI).toBe("antonio-pt-br");
  });

  it("does not start Google's generic voice when no masculine voice is available", async () => {
    voices = [voices[0]!];
    const started = await speakJarvis("Teste de fala");
    expect(started).toBe(false);
    expect(browserSpeak).not.toHaveBeenCalled();
  });
});
