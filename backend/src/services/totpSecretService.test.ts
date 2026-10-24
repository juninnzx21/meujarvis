import { beforeEach, describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import { createRecoveryCodes, decryptTotpSecret, encryptTotpSecret, hashRecoveryCode } from "./totpSecretService.js";

describe("TOTP secret protection and recovery codes", () => {
  beforeEach(() => { env.TOTP_ENCRYPTION_KEY = "unit-test-only-key-material-0123456789"; });

  it("encrypts secrets with authenticated encryption and decrypts the original", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("rejects modified ciphertext", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const [version, iv, tag, ciphertext] = encrypted.split(":");
    const changedTag = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
    expect(() => decryptTotpSecret([version, iv, changedTag, ciphertext].join(":"))).toThrow();
  });

  it("rejects additional encrypted fields and malformed IV or tag sizes", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    expect(() => decryptTotpSecret(`${encrypted}:unexpected`)).toThrow(/Malformed/u);
    expect(() => decryptTotpSecret("totp:v1:AA:AA:AA")).toThrow(/Malformed/u);
    const parts = encrypted.split(":");
    parts[2] = `${parts[2]}!`;
    expect(() => decryptTotpSecret(parts.join(":"))).toThrow(/Malformed/u);
  });

  it("refuses to encrypt when the dedicated key is missing or too short", () => {
    env.TOTP_ENCRYPTION_KEY = "short";
    expect(() => encryptTotpSecret("JBSWY3DPEHPK3PXP")).toThrow(/TOTP_ENCRYPTION_KEY/u);
  });

  it("refuses to reuse the JWT signing secret for TOTP encryption", () => {
    env.TOTP_ENCRYPTION_KEY = env.JWT_SECRET;
    expect(() => encryptTotpSecret("JBSWY3DPEHPK3PXP")).toThrow(/different from JWT_SECRET/u);
  });

  it("creates unique recovery codes and stores only deterministic hashes", () => {
    const result = createRecoveryCodes();
    expect(result.codes).toHaveLength(10);
    expect(new Set(result.codes).size).toBe(10);
    expect(result.hashes).toEqual(result.codes.map(hashRecoveryCode));
    expect(result.hashes.every((hash) => !result.codes.includes(hash))).toBe(true);
  });
});
