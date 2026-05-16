import crypto from "node:crypto";
import { env } from "../config/env.js";

const prefix = "enc:v1:";

function key() {
  const material = env.SETTINGS_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash("sha256").update(material).digest();
}

export function isEncryptedSecret(value: unknown) {
  return typeof value === "string" && value.startsWith(prefix);
}

export function encryptSecret(value: string) {
  if (!value) return value;
  if (isEncryptedSecret(value)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${prefix}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  if (!isEncryptedSecret(value)) return value;
  const [, , ivPart, tagPart, encryptedPart] = value.split(":");
  if (!ivPart || !tagPart || !encryptedPart) return "";
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function maskSecret(value: string) {
  const plain = isEncryptedSecret(value) ? decryptSecret(value) : value;
  if (!plain) return "";
  if (plain.length <= 8) return "********";
  return `${plain.slice(0, 4)}...${plain.slice(-4)}`;
}

export function isSecretSettingKey(key: string) {
  return /(token|api_key|apikey|secret|password|credential)/i.test(key);
}

export function encryptSettingValue(key: string, value: unknown) {
  if (!isSecretSettingKey(key) || typeof value !== "string" || !value.trim()) return value;
  return encryptSecret(value.trim());
}

export function decryptSettingValue(key: string, value: unknown) {
  if (!isSecretSettingKey(key) || typeof value !== "string") return value;
  return decryptSecret(value);
}

export function publicSettingValue(key: string, value: unknown) {
  if (!isSecretSettingKey(key)) return value;
  if (typeof value === "string" && value) return { configured: true, masked: maskSecret(value) };
  return { configured: false };
}
