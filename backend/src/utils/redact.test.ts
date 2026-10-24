import { describe, expect, it } from "vitest";
import { redactSensitive } from "./redact.js";
import { sanitizeAutomationLog, sanitizeSystemLog } from "../services/systemLogService.js";

describe("redactSensitive", () => {
  it("redacts credential query parameters embedded in log text", () => {
    expect(redactSensitive("https://example.invalid/callback?state=safe&token=secret&next=/home"))
      .toBe("https://example.invalid/callback?state=safe&token=[REDACTED]&next=/home");
  });

  it("redacts key/value secrets in free-form error details", () => {
    expect(redactSensitive("database password=private-value; api_key: 'private-api-key'"))
      .toBe("database password=[REDACTED]; api_key: '[REDACTED]'");
  });
});

describe("sanitizeSystemLog", () => {
  it("redacts historical secrets and URLs at read time", () => {
    const row = sanitizeSystemLog({
      message: "Webhook failed at https://n8n.example/webhook/private-hook?token=private-token",
      metadata: { webhookUrl: "https://n8n.example/webhook/private-hook", detail: "Bearer private-token" }
    });
    expect(JSON.stringify(row)).not.toContain("private-hook");
    expect(JSON.stringify(row)).not.toContain("private-token");
    expect(row.message).toContain("[REDACTED_URL]");
    expect(row.metadata).toMatchObject({ webhookUrl: "[REDACTED_URL]" });
  });

  it("redacts historical automation inputs, outputs, errors, and bare webhook paths", () => {
    const row = sanitizeAutomationLog({
      input: { callback: "/webhook/private-path-token/secondary-secret", apiKey: "private-api-token" },
      output: { message: "sent to https://n8n.example.invalid/webhook/private-path-token?token=private-api-token" },
      error: "failed at /webhooks/another-private-token and /webhook-test/test-hook-id"
    });
    expect(JSON.stringify(row)).not.toContain("private-path-token");
    expect(JSON.stringify(row)).not.toContain("another-private-token");
    expect(JSON.stringify(row)).not.toContain("secondary-secret");
    expect(JSON.stringify(row)).not.toContain("test-hook-id");
    expect(JSON.stringify(row)).not.toContain("private-api-token");
    expect(JSON.stringify(row)).toContain("[REDACTED_URL]");
  });

  it("redacts arbitrary relative query parameters", () => {
    const row = sanitizeSystemLog({ message: "callback failed at /internal/callback?key=private&nonce=also-private" });
    expect(JSON.stringify(row)).not.toContain("private");
    expect(JSON.stringify(row)).not.toContain("also-private");
  });
});
