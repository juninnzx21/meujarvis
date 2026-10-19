import { describe, expect, it } from "vitest";
import {
  createTotpCode,
  createTotpProvisioningUri,
  generateTotpSecret,
  verifyTotpCode
} from "./totpService.js";

describe("TOTP service", () => {
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"]
  ])("matches RFC 6238 SHA-1 vector at %i seconds", (seconds, expected) => {
    expect(createTotpCode(rfcSecret, seconds * 1000)).toBe(expected);
  });

  it("generates independent base32 secrets and verifies only codes in its time window", () => {
    const first = generateTotpSecret();
    const second = generateTotpSecret();
    const now = 1_700_000_000_000;
    const code = createTotpCode(first, now);

    expect(first).toMatch(/^[A-Z2-7]+$/u);
    expect(first).toHaveLength(32);
    expect(second).not.toBe(first);
    expect(verifyTotpCode(first, code, now)).toBe(true);
    expect(verifyTotpCode(first, createTotpCode(first, now + 60_000), now)).toBe(false);
    expect(verifyTotpCode(first, createTotpCode(first, 0), 0)).toBe(true);
    expect(verifyTotpCode(first, "12x456", now)).toBe(false);
    expect(verifyTotpCode(second, code, now)).toBe(false);
  });

  it("builds an authenticator-compatible provisioning URI without leaking extra parameters", () => {
    const uri = new URL(createTotpProvisioningUri({ secret: rfcSecret, account: "admin@example.com", issuer: "JARVIS" }));
    expect(uri.protocol).toBe("otpauth:");
    expect(uri.pathname).toBe("/JARVIS%3Aadmin%40example.com");
    expect(uri.searchParams.get("secret")).toBe(rfcSecret);
    expect(uri.searchParams.get("issuer")).toBe("JARVIS");
    expect(uri.searchParams.get("digits")).toBe("6");
    expect(uri.searchParams.get("period")).toBe("30");
  });

  it("rejects malformed secrets and invalid provisioning details", () => {
    expect(() => createTotpCode("NOT-A-SECRET", 0)).toThrow("Invalid TOTP secret");
    expect(() => createTotpProvisioningUri({ secret: rfcSecret, account: " ", issuer: "JARVIS" })).toThrow("Invalid TOTP account details");
    expect(() => generateTotpSecret(8)).toThrow("TOTP secret size must be between 16 and 64 bytes");
  });
});
