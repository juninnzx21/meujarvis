import { describe, expect, it } from "vitest";
import { normalizeWhatsAppConnectionState } from "./connectionState.js";

describe("normalizeWhatsAppConnectionState", () => {
  it("recognizes connected states from Evolution response shapes", () => {
    expect(normalizeWhatsAppConnectionState({ instance: { state: "open" } })).toBe("connected");
    expect(normalizeWhatsAppConnectionState({ connectionState: "online" })).toBe("connected");
  });

  it("does not treat an HTTP/API success response as a connected WhatsApp session", () => {
    expect(normalizeWhatsAppConnectionState({ status: "success", instance: { state: "close" } })).toBe("disconnected");
    expect(normalizeWhatsAppConnectionState({ status: "success" })).toBe("unknown");
  });

  it("preserves connecting and unknown states", () => {
    expect(normalizeWhatsAppConnectionState({ instance: { state: "connecting" } })).toBe("connecting");
    expect(normalizeWhatsAppConnectionState(null)).toBe("unknown");
  });
});
