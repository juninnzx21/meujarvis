import { describe, expect, it } from "vitest";
import { isValidWebhookSecret, validateEvolutionWebhook } from "./webhookSecurity.js";

const validMetadata = {
  event: "MESSAGES_UPSERT",
  instance: "jarvis-main",
  expectedInstance: "jarvis-main",
  messageId: "BAE5E1F23A",
  phone: "5511999999999",
  allowedSenders: ["5511999999999"],
  fromMe: false,
  isGroup: false
};

describe("Evolution webhook security", () => {
  it("compares the configured secret without accepting empty or different values", () => {
    expect(isValidWebhookSecret("a-long-test-secret", "a-long-test-secret")).toBe(true);
    expect(isValidWebhookSecret("a-long-test-secret", "a-long-test-secreu")).toBe(false);
    expect(isValidWebhookSecret("a-long-test-secret", undefined)).toBe(false);
    expect(isValidWebhookSecret("", "anything")).toBe(false);
  });

  it("accepts only the configured instance, message event and authorized individual sender", () => {
    expect(validateEvolutionWebhook(validMetadata)).toBeNull();
    expect(validateEvolutionWebhook({ ...validMetadata, event: "" })).toBe("unsupported_event");
    expect(validateEvolutionWebhook({ ...validMetadata, event: "CONNECTION_UPDATE" })).toBe("unsupported_event");
    expect(validateEvolutionWebhook({ ...validMetadata, instance: "other" })).toBe("instance_mismatch");
    expect(validateEvolutionWebhook({ ...validMetadata, messageId: "" })).toBe("message_id_required");
    expect(validateEvolutionWebhook({ ...validMetadata, phone: "5511888888888" })).toBe("sender_not_allowed");
    expect(validateEvolutionWebhook({ ...validMetadata, phone: "123" })).toBe("invalid_sender");
    expect(validateEvolutionWebhook({ ...validMetadata, isGroup: true })).toBe("invalid_sender");
    expect(validateEvolutionWebhook({ ...validMetadata, fromMe: true })).toBe("from_me");
    expect(validateEvolutionWebhook({ ...validMetadata, allowedSenders: [] })).toBe("sender_not_allowed");
  });
});
