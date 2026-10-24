import crypto from "node:crypto";
import { env } from "../config/env.js";

export const PREFIX_V1 = "enc:v1:";
export const PREFIX_V2 = "enc:v2:";
const BACKUP_INTEGRITY_CONTEXT = "jarvis/settings-backup/v2";

export function deriveKeyFromMaterial(material: string): Buffer {
  return crypto.createHash("sha256").update(material, "utf8").digest();
}

function deriveBackupIntegrityKey(material: string): Buffer {
  return crypto.createHmac("sha256", deriveKeyFromMaterial(material))
    .update(BACKUP_INTEGRITY_CONTEXT, "utf8")
    .digest();
}

function getPrimaryMaterial(): string {
  const material = env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (!material) throw new Error("SETTINGS_ENCRYPTION_KEY não configurada.");
  if (material.length < 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY precisa ter ao menos 32 caracteres.");
  }
  if (material === env.JWT_SECRET?.trim()) {
    throw new Error("SETTINGS_ENCRYPTION_KEY precisa ser diferente de JWT_SECRET.");
  }
  return material;
}

export function createSettingsBackupIntegrity(payload: string): string {
  return crypto.createHmac("sha256", deriveBackupIntegrityKey(getPrimaryMaterial()))
    .update(payload, "utf8")
    .digest("base64url");
}

export function verifySettingsBackupIntegrity(payload: string, integrity: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(integrity)) return false;
  const supplied = Buffer.from(integrity, "base64url");
  if (supplied.length !== 32 || supplied.toString("base64url") !== integrity) return false;

  const materials: string[] = [];
  try {
    materials.push(getPrimaryMaterial());
  } catch {
    // A backup may need the explicitly configured previous settings key for recovery.
  }
  const oldMaterial = env.SETTINGS_ENCRYPTION_KEY_OLD?.trim();
  if (
    oldMaterial && oldMaterial.length >= 32 &&
    oldMaterial !== env.JWT_SECRET?.trim() && !materials.includes(oldMaterial)
  ) materials.push(oldMaterial);
  if (materials.length === 0) return false;

  return materials.some((material) => {
    const expected = crypto.createHmac("sha256", deriveBackupIntegrityKey(material))
      .update(payload, "utf8")
      .digest();
    return crypto.timingSafeEqual(expected, supplied);
  });
}

function tryDecipherGcm(key: Buffer, ivPart: string, tagPart: string, encryptedPart: string): string {
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  if (
    !base64UrlPattern.test(ivPart) ||
    !base64UrlPattern.test(tagPart) ||
    !base64UrlPattern.test(encryptedPart)
  ) return "";

  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  if (iv.length !== 12 || tag.length !== 16) return "";
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: tag.length });
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final()
  ]);
  return new TextDecoder("utf-8", { fatal: true }).decode(decrypted);
}

export function isEncryptedSecret(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("enc:");
}

export function getSecretEncryptionVersion(value: unknown): "v2" | "v1" | "plain" | "unsupported" {
  if (typeof value !== "string") return "plain";
  if (value.startsWith(PREFIX_V2)) return "v2";
  if (value.startsWith(PREFIX_V1)) return "v1";
  if (value.startsWith("enc:")) return "unsupported";
  return "plain";
}

export function needsReEncryption(value: unknown): boolean {
  if (typeof value !== "string" || !isEncryptedSecret(value)) return false;
  const version = getSecretEncryptionVersion(value);
  if (version === "unsupported") return true;

  const parts = value.split(":");
  if (parts.length !== 5) return true;
  if (version !== "v2") return true;
  const [, , ivPart, tagPart, encryptedPart] = parts;
  if (!ivPart || !tagPart || !encryptedPart) return true;

  try {
    const plain = tryDecipherGcm(deriveKeyFromMaterial(getPrimaryMaterial()), ivPart, tagPart, encryptedPart);
    if (plain) return false;
  } catch {
    // A failed primary-key attempt can still be readable with the rotation key.
  }

  const oldMaterial = env.SETTINGS_ENCRYPTION_KEY_OLD?.trim();
  if (oldMaterial && oldMaterial !== env.JWT_SECRET?.trim()) {
    try {
      tryDecipherGcm(deriveKeyFromMaterial(oldMaterial), ivPart, tagPart, encryptedPart);
    } catch {
      // The rotation service will fail closed if none of the supported keys work.
    }
  }
  return true;
}

export function encryptSecret(value: string): string {
  if (!value) return value;
  if (typeof value === "string" && value.startsWith(PREFIX_V2)) return value;
  if (typeof value === "string" && value.startsWith(PREFIX_V1)) return value;
  if (value.startsWith("enc:")) throw new Error("Formato de cifragem de configuração não suportado.");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKeyFromMaterial(getPrimaryMaterial()), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX_V2}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string): string {
  if (!isEncryptedSecret(value)) return value;

  const version = getSecretEncryptionVersion(value);
  if (version === "unsupported") return "";

  const parts = value.split(":");
  if (parts.length !== 5) return "";
  const [, , ivPart, tagPart, encryptedPart] = parts;
  if (!ivPart || !tagPart || !encryptedPart) return "";

  const candidates: string[] = [];
  if (value.startsWith(PREFIX_V2)) {
    try {
      candidates.push(getPrimaryMaterial());
    } catch {
      // A v2 secret may still be readable with the explicitly configured old key.
    }
    const oldMaterial = env.SETTINGS_ENCRYPTION_KEY_OLD?.trim();
    if (oldMaterial && oldMaterial !== env.JWT_SECRET?.trim()) candidates.push(oldMaterial);
  } else {
    try {
      candidates.push(getPrimaryMaterial());
    } catch {
      // Legacy ciphertext may still be readable with the previous or JWT key.
    }
    const oldMaterial = env.SETTINGS_ENCRYPTION_KEY_OLD?.trim();
    if (oldMaterial && oldMaterial !== env.JWT_SECRET?.trim()) candidates.push(oldMaterial);
    const legacyJwtMaterial = env.JWT_SECRET?.trim();
    if (legacyJwtMaterial) candidates.push(legacyJwtMaterial);
  }

  for (const material of candidates) {
    try {
      const plain = tryDecipherGcm(deriveKeyFromMaterial(material), ivPart, tagPart, encryptedPart);
      if (plain) return plain;
    } catch {
      // Try only the explicitly supported migration keys.
    }
  }
  return "";
}

export function maskSecret(value: string): string {
  const plain = isEncryptedSecret(value) ? decryptSecret(value) : value;
  if (!plain) return "";
  if (plain.length <= 8) return "********";
  return `${plain.slice(0, 4)}...${plain.slice(-4)}`;
}

export function isSecretSettingKey(key: string): boolean {
  return /(token|api_key|apikey|secret|password|credential)/i.test(key);
}

export function encryptSettingValue(key: string, value: unknown): unknown {
  if (!isSecretSettingKey(key) || typeof value !== "string" || !value.trim()) return value;
  return encryptSecret(value.trim());
}

export function decryptSettingValue(key: string, value: unknown): unknown {
  if (!isSecretSettingKey(key) || typeof value !== "string") return value;
  return decryptSecret(value);
}

export function publicSettingValue(key: string, value: unknown): unknown {
  if (!isSecretSettingKey(key)) return value;
  if (typeof value === "string" && value) return { configured: true, masked: maskSecret(value) };
  return { configured: false };
}
