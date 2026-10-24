import { describe, expect, it, vi } from "vitest";
import { checkPiperHealth, synthesizeWithPiper } from "./piperTtsClient.js";

function wavHeader() {
  const data = Buffer.alloc(44);
  data.write("RIFF", 0, "ascii");
  data.write("WAVE", 8, "ascii");
  data.write("fmt ", 12, "ascii");
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(22050, 24);
  data.writeUInt32LE(44100, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36, "ascii");
  return data;
}

describe("Piper TTS HTTP client", () => {
  it("reports a local engine as not configured without an endpoint", async () => {
    await expect(checkPiperHealth("")).resolves.toEqual({ status: "not_configured" });
  });

  it("reads model availability from the private health endpoint", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "ok", model: "pt_BR-cadu-medium" }), { status: 200 }));
    await expect(checkPiperHealth("http://piper:5000/", fetcher)).resolves.toMatchObject({ status: "available", model: "pt_BR-cadu-medium" });
    expect(fetcher).toHaveBeenCalledWith("http://piper:5000/health", expect.any(Object));
  });

  it("accepts a playable WAV response and rejects unrelated content", async () => {
    const audio = wavHeader();
    const fetcher = vi.fn(async () => new Response(audio, { status: 200, headers: { "Content-Type": "audio/wav" } }));
    await expect(synthesizeWithPiper("Olá, JARVIS.", "http://piper:5000", fetcher)).resolves.toEqual(audio);
    const invalidFetcher = vi.fn(async () => new Response("not audio", { status: 200, headers: { "Content-Type": "text/plain" } }));
    await expect(synthesizeWithPiper("Olá", "http://piper:5000", invalidFetcher)).rejects.toThrow("formato de áudio inválido");
  });

  it("rejects a truncated or malformed WAV", async () => {
    const fetcher = vi.fn(async () => new Response(Buffer.from("RIFFshort"), { status: 200, headers: { "Content-Type": "audio/wav" } }));
    await expect(synthesizeWithPiper("Olá", "http://piper:5000", fetcher)).rejects.toThrow("WAV inválido");
  });
});
