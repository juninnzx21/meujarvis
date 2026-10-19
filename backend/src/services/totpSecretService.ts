import crypto from "node:crypto";
import { env } from "../config/env.js";

const prefix = "totp:v1:";

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Malformed encrypted TOTP secret");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) throw new Error("Malformed encrypted TOTP secret");
  return decoded;
}

function key() {
  const material = env.TOTP_ENCRYPTION_KEY;
  if (material.length < 32) throw new Error("TOTP_ENCRYPTION_KEY must contain at least 32 characters");
  if (material === env.JWT_SECRET) throw new Error("TOTP_ENCRYPTION_KEY must be different from JWT_SECRET");
  return crypto.createHash("sha256").update(material, "utf8").digest();
}

export function encryptTotpSecret(value: string) {
  if (!value) throw new Error("TOTP secret is required");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${prefix}${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptTotpSecret(value: string) {
  if (!value.startsWith(prefix)) throw new Error("Unsupported encrypted TOTP secret format");
  const parts = value.slice(prefix.length).split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted TOTP secret");
  const [ivPart, tagPart, ciphertextPart] = parts;
  if (!ivPart || !tagPart || !ciphertextPart) throw new Error("Malformed encrypted TOTP secret");
  const iv = decodeBase64Url(ivPart);
  const tag = decodeBase64Url(tagPart);
  const ciphertext = decodeBase64Url(ciphertextPart);
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) throw new Error("Malformed encrypted TOTP secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString("utf8");
}

export function hashRecoveryCode(code: string) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

export function createRecoveryCodes(count = 10) {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Recovery code count must be between 1 and 20");
  const codes = Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(12).toString("hex").toUpperCase();
    return `${raw.slice(0, 8)}-${raw.slice(8, 16)}-${raw.slice(16)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}
