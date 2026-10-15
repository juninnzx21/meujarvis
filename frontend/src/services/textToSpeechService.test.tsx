import { describe, expect, it } from "vitest";
import { selectBestJarvisVoice } from "./textToSpeechService";

describe("selectBestJarvisVoice", () => {
  it("prefers a masculine Brazilian Portuguese voice over a generic Google Brazil voice", () => {
    const voices = [
      { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" },
      { name: "Microsoft Francisca Online (Natural)", lang: "pt-BR", voiceURI: "francisca-pt-br" },
      { name: "Microsoft Antonio Online (Natural)", lang: "pt-BR", voiceURI: "antonio-pt-br" }
    ] as SpeechSynthesisVoice[];

    expect(selectBestJarvisVoice(voices)?.voiceURI).toBe("antonio-pt-br");
  });

  it("does not classify a voice as masculine only because its name mentions Brazil", () => {
    const voices = [
      { name: "Google português do Brasil", lang: "pt-BR", voiceURI: "google-pt-br" },
      { name: "Microsoft Daniel Online", lang: "en-GB", voiceURI: "daniel-en-gb" }
    ] as SpeechSynthesisVoice[];

    expect(selectBestJarvisVoice(voices)?.voiceURI).toBe("google-pt-br");
  });
});
