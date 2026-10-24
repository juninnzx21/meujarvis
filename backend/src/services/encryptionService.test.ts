import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import {
  PREFIX_V1,
  PREFIX_V2,
  createSettingsBackupIntegrity,
  decryptSecret,
  decryptSettingValue,
  deriveKeyFromMaterial,
  encryptSecret,
  encryptSettingValue,
  getSecretEncryptionVersion,
  isEncryptedSecret,
  isSecretSettingKey,
  maskSecret,
  needsReEncryption,
  publicSettingValue,
  verifySettingsBackupIntegrity
} from "./encryptionService.js";

const SYNTHETIC_PRIMARY_KEY = "synthetic-primary-settings-key-00000000000000000";
const SYNTHETIC_OLD_KEY = "synthetic-old-settings-key-000000000000000000000";
const SYNTHETIC_JWT_SECRET = "synthetic-jwt-secret-0000000000000000000000000";

describe("SEC-002: encryptionService — separação de chaves e versionamento", () => {
  beforeEach(() => {
    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_PRIMARY_KEY;
    env.SETTINGS_ENCRYPTION_KEY_OLD = "";
    env.JWT_SECRET = SYNTHETIC_JWT_SECRET;
  });

  it("cifra segredos no formato versionado enc:v2 com SETTINGS_ENCRYPTION_KEY", () => {
    const plain = "super-secret-token-12345";
    const encrypted = encryptSecret(plain);

    expect(encrypted.startsWith(PREFIX_V2)).toBe(true);
    expect(encrypted).not.toContain(plain);
    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(getSecretEncryptionVersion(encrypted)).toBe("v2");
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("rejeita cifragem se SETTINGS_ENCRYPTION_KEY for inferior a 32 caracteres", () => {
    env.SETTINGS_ENCRYPTION_KEY = "short-key";
    expect(() => encryptSecret("any-secret")).toThrow(/SETTINGS_ENCRYPTION_KEY/i);
  });

  it("rejeita reutilização de JWT_SECRET como chave de cifra dedicada", () => {
    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_JWT_SECRET;
    expect(() => encryptSecret("must-not-share-key-material")).toThrow(/diferente de JWT_SECRET/i);
  });

  it("não usa JWT_SECRET quando SETTINGS_ENCRYPTION_KEY está ausente", () => {
    env.SETTINGS_ENCRYPTION_KEY = "";
    expect(() => encryptSecret("must-not-use-jwt")).toThrow(/SETTINGS_ENCRYPTION_KEY/i);
  });

  it("rejeita adulteração de ciphertext e tag de autenticação em enc:v2", () => {
    const encrypted = encryptSecret("integrity-check-secret");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(5); // ["enc", "v2", iv, tag, ciphertext]

    // Alterar tag
    const badTag = parts[3][0] === "A" ? `B${parts[3].slice(1)}` : `A${parts[3].slice(1)}`;
    const tamperedTag = [parts[0], parts[1], parts[2], badTag, parts[4]].join(":");
    expect(decryptSecret(tamperedTag)).toBe("");
    expect(needsReEncryption(tamperedTag)).toBe(true);

    // Alterar ciphertext
    const badCipher = parts[4][0] === "A" ? `B${parts[4].slice(1)}` : `A${parts[4].slice(1)}`;
    const tamperedCipher = [parts[0], parts[1], parts[2], parts[3], badCipher].join(":");
    expect(decryptSecret(tamperedCipher)).toBe("");
    expect(needsReEncryption(tamperedCipher)).toBe(true);
  });

  it("rejeita enc:v1 e enc:v2 com segmentos adicionais", () => {
    const malformedV2 = `${encryptSecret("strict-segment-count-v2")}:unexpected-suffix`;
    expect(decryptSecret(malformedV2)).toBe("");
    expect(needsReEncryption(malformedV2)).toBe(true);

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", deriveKeyFromMaterial(SYNTHETIC_JWT_SECRET), iv);
    const encrypted = Buffer.concat([cipher.update("strict-segment-count-v1", "utf8"), cipher.final()]);
    const validV1 = `${PREFIX_V1}${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
    const malformedV1 = `${validV1}:unexpected-suffix`;
    expect(decryptSecret(malformedV1)).toBe("");
    expect(needsReEncryption(malformedV1)).toBe(true);
  });

  it("falha fechado em formatos de cifra desconhecidos", () => {
    const futureFormat = "enc:v3:unsupported";
    expect(isEncryptedSecret(futureFormat)).toBe(true);
    expect(getSecretEncryptionVersion(futureFormat)).toBe("unsupported");
    expect(decryptSecret(futureFormat)).toBe("");
    expect(needsReEncryption(futureFormat)).toBe(true);
    expect(() => encryptSecret(futureFormat)).toThrow(/não suportado/i);
  });

  it("preserva leitura retrocompatível de segredos legados enc:v1 com fallback para JWT_SECRET", () => {
    // Simular um segredo legado cifrado originalmente usando JWT_SECRET
    const legacyKey = deriveKeyFromMaterial(SYNTHETIC_JWT_SECRET);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
    const encryptedBytes = Buffer.concat([cipher.update("legacy-value-using-jwt", "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const legacySecret = `${PREFIX_V1}${iv.toString("base64url")}:${tag.toString("base64url")}:${encryptedBytes.toString("base64url")}`;

    expect(legacySecret.startsWith(PREFIX_V1)).toBe(true);
    expect(isEncryptedSecret(legacySecret)).toBe(true);
    expect(getSecretEncryptionVersion(legacySecret)).toBe("v1");

    // Decifra com sucesso usando o fallback seguro de migração
    const decrypted = decryptSecret(legacySecret);
    expect(decrypted).toBe("legacy-value-using-jwt");
  });

  it("permite leitura com SETTINGS_ENCRYPTION_KEY_OLD durante janela de rotação", () => {
    // Cifrar com a chave antiga
    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_OLD_KEY;
    const encryptedWithOld = encryptSecret("secret-under-old-key");

    // Rotacionar para a nova chave primária e mover a anterior para SETTINGS_ENCRYPTION_KEY_OLD
    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_PRIMARY_KEY;
    env.SETTINGS_ENCRYPTION_KEY_OLD = SYNTHETIC_OLD_KEY;

    // Consegue decifrar o valor da chave antiga normalmente
    expect(decryptSecret(encryptedWithOld)).toBe("secret-under-old-key");

    // Novos segredos são cifrados com a nova chave primária
    const encryptedWithNew = encryptSecret("secret-under-new-key");
    expect(decryptSecret(encryptedWithNew)).toBe("secret-under-new-key");

    // Remover chave antiga: o novo continua decifrável, o antigo falha fechado
    env.SETTINGS_ENCRYPTION_KEY_OLD = "";
    expect(decryptSecret(encryptedWithNew)).toBe("secret-under-new-key");
    expect(decryptSecret(encryptedWithOld)).toBe("");
  });

  it("prova que a rotação de JWT_SECRET tem impacto nulo em segredos cifrados com SETTINGS_ENCRYPTION_KEY", () => {
    const encrypted = encryptSecret("independent-key-secret");
    expect(decryptSecret(encrypted)).toBe("independent-key-secret");

    // Rotacionar JWT_SECRET para outro valor completamente diferente
    env.JWT_SECRET = "completely-different-jwt-secret-rotated-999999999";

    // O segredo continua decifrável com 100% de integridade
    expect(decryptSecret(encrypted)).toBe("independent-key-secret");
  });

  it("autentica backups com chave dedicada e valida a chave anterior durante a rotação", () => {
    const payload = JSON.stringify({ id: "synthetic-setting-id", value: encryptSecret("synthetic-secret") });
    const integrity = createSettingsBackupIntegrity(payload);

    expect(verifySettingsBackupIntegrity(payload, integrity)).toBe(true);
    expect(verifySettingsBackupIntegrity(`${payload} `, integrity)).toBe(false);

    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_OLD_KEY;
    env.SETTINGS_ENCRYPTION_KEY_OLD = SYNTHETIC_PRIMARY_KEY;
    expect(verifySettingsBackupIntegrity(payload, integrity)).toBe(true);

    env.SETTINGS_ENCRYPTION_KEY_OLD = "";
    expect(verifySettingsBackupIntegrity(payload, integrity)).toBe(false);
  });

  it("verifica backup com a chave anterior quando a chave atual não está disponível", () => {
    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_OLD_KEY;
    const payload = JSON.stringify({ id: "synthetic-old-key-backup", value: encryptSecret("synthetic-recovery-secret") });
    const integrity = createSettingsBackupIntegrity(payload);

    env.SETTINGS_ENCRYPTION_KEY = "";
    env.SETTINGS_ENCRYPTION_KEY_OLD = SYNTHETIC_OLD_KEY;
    expect(verifySettingsBackupIntegrity(payload, integrity)).toBe(true);

    env.SETTINGS_ENCRYPTION_KEY_OLD = "";
    expect(verifySettingsBackupIntegrity(payload, integrity)).toBe(false);
  });

  it("identifica corretamente necessidades de re-encriptação (needsReEncryption)", () => {
    // enc:v1 sempre precisa de re-encriptação
    const legacyKey = deriveKeyFromMaterial(SYNTHETIC_PRIMARY_KEY);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
    const enc = Buffer.concat([cipher.update("test", "utf8"), cipher.final()]);
    const v1Secret = `${PREFIX_V1}${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${enc.toString("base64url")}`;
    expect(needsReEncryption(v1Secret)).toBe(true);

    // enc:v2 com a chave atual NÃO precisa de re-encriptação
    const v2Secret = encryptSecret("current-v2");
    expect(needsReEncryption(v2Secret)).toBe(false);

    // enc:v2 com a chave antiga precisa de re-encriptação quando SETTINGS_ENCRYPTION_KEY_OLD está configurada
    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_OLD_KEY;
    const oldV2 = encryptSecret("old-v2");
    env.SETTINGS_ENCRYPTION_KEY = SYNTHETIC_PRIMARY_KEY;
    env.SETTINGS_ENCRYPTION_KEY_OLD = SYNTHETIC_OLD_KEY;
    expect(needsReEncryption(oldV2)).toBe(true);

    // Texto plano ou tipos não string
    expect(needsReEncryption("plain-text")).toBe(false);
    expect(needsReEncryption(null)).toBe(false);
    expect(needsReEncryption(123)).toBe(false);
  });

  it("cifra e decifra apenas chaves identificadas como secretSettingKey", () => {
    expect(isSecretSettingKey("whatsapp_evolution_api_key")).toBe(true);
    expect(isSecretSettingKey("home_assistant_token")).toBe(true);
    expect(isSecretSettingKey("n8n_webhook_secret")).toBe(true);
    expect(isSecretSettingKey("public_frontend_url")).toBe(false);
    expect(isSecretSettingKey("monitoring_alerts_enabled")).toBe(false);

    // encryptSettingValue e decryptSettingValue
    const encToken = encryptSettingValue("home_assistant_token", "token-xyz");
    expect(isEncryptedSecret(encToken)).toBe(true);
    expect(decryptSettingValue("home_assistant_token", encToken)).toBe("token-xyz");

    // Chave não secreta não é cifrada
    const nonSecret = encryptSettingValue("public_frontend_url", "https://jarvis.example.com");
    expect(nonSecret).toBe("https://jarvis.example.com");
    expect(decryptSettingValue("public_frontend_url", nonSecret)).toBe("https://jarvis.example.com");
  });

  it("mascara segredos sem expor conteúdo sensível", () => {
    const encrypted = encryptSecret("very-long-super-secret-api-token-value");
    const masked = maskSecret(encrypted);
    expect(masked).toBe("very...alue");
    expect(masked).not.toContain("long-super-secret");

    const shortEncrypted = encryptSecret("12345");
    expect(maskSecret(shortEncrypted)).toBe("********");

    const pub = publicSettingValue("api_key", encrypted) as { configured: boolean; masked: string };
    expect(pub.configured).toBe(true);
    expect(pub.masked).toBe("very...alue");
  });
});
