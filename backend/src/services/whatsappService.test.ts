import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { whatsappService } from "./whatsappService.js";

describe("WhatsApp inbound media safety", () => {
  afterEach(() => vi.restoreAllMocks());

  it("never fetches an event-provided attachment URL", async () => {
    const getSpy = vi.spyOn(axios, "get");
    const result = await whatsappService.downloadInboundAttachment({
      event: "MESSAGES_UPSERT",
      instance: "jarvis-test",
      data: {
        key: { id: "media-url-test", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        message: { documentMessage: { fileName: "extrato.csv", mimetype: "text/csv", url: "http://127.0.0.1:2375/containers/json" } }
      }
    });

    expect(result.status).toBe("attachment_unavailable");
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("never fetches an event-provided audio URL", async () => {
    const getSpy = vi.spyOn(axios, "get");
    const result = await whatsappService.transcribeInboundAudio({
      event: "MESSAGES_UPSERT",
      instance: "jarvis-test",
      data: {
        key: { id: "audio-url-test", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        message: { audioMessage: { mimetype: "audio/ogg", url: "http://169.254.169.254/latest/meta-data/" } }
      }
    });

    expect(result.status).toBe("audio_unavailable");
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("continues to parse media delivered as bounded base64", async () => {
    const result = await whatsappService.downloadInboundAttachment({
      data: {
        message: {
          documentMessage: {
            fileName: "extrato.csv",
            mimetype: "text/csv",
            base64: Buffer.from("data,amount\n2026-10-16,10.00", "utf8").toString("base64")
          }
        }
      }
    });

    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.content).toContain("data,amount");
  });
});
