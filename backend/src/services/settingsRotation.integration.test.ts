import { randomUUID } from "node:crypto";
import crypto from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import {
  assertDisposablePostgresConnection,
  isVerifiedDisposablePostgresUrl
} from "../test-utils/disposablePostgres.js";
import {
  PREFIX_V1,
  PREFIX_V2,
  decryptSettingValue,
  deriveKeyFromMaterial,
  encryptSecret,
  getSecretEncryptionVersion,
  isEncryptedSecret
} from "./encryptionService.js";
import {
  createSettingsBackupPayload,
  restoreSettingsFromBackup,
  rotateAllSecretSettings,
  createSettingsBackup
} from "./settingsRotationService.js";

const configuredDatabaseUrl = process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL?.trim() ?? "";
const databaseUrl = configuredDatabaseUrl
  ? configuredDatabaseUrl
  : undefined;
if (databaseUrl && (
  process.env.DATABASE_URL !== databaseUrl ||
  !isVerifiedDisposablePostgresUrl(databaseUrl)
)) {
  throw new Error("SEC-002 integration tests require the verified disposable PostgreSQL container.");
}

const KEY_PRIMARY = "synthetic-sec002-primary-key-000000000000000000";
const KEY_OLD = "synthetic-sec002-old-key-00000000000000000000000";
const KEY_LEGACY_JWT = "synthetic-sec002-jwt-legacy-00000000000000000";

describe.skipIf(!databaseUrl)("SEC-002: settingsRotation — integração com PostgreSQL descartável", () => {
  const runId = randomUUID();
  let testUserId = "";
  let temporaryDirectory = "";
  let backupDirectory = "";

  beforeAll(async () => {
    await assertDisposablePostgresConnection(databaseUrl!, () => prisma.$queryRaw`
      SELECT current_database() AS "database",
        current_user AS "role",
        inet_server_addr()::text AS "serverAddress",
        inet_server_port() AS "serverPort"
    `);
    env.SETTINGS_ENCRYPTION_KEY = KEY_PRIMARY;
    env.SETTINGS_ENCRYPTION_KEY_OLD = KEY_OLD;
    env.JWT_SECRET = KEY_LEGACY_JWT;
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "jarvis-sec002-"));
    backupDirectory = path.join(temporaryDirectory, "backups");

    const user = await prisma.user.create({
      data: {
        name: `SEC002 User ${runId.slice(0, 8)}`,
        email: `sec002-${runId}@example.invalid`,
        passwordHash: "synthetic-hash"
      }
    });
    testUserId = user.id;

    const jwtKey = deriveKeyFromMaterial(KEY_LEGACY_JWT);
    const iv1 = crypto.randomBytes(12);
    const cipher1 = crypto.createCipheriv("aes-256-gcm", jwtKey, iv1);
    const enc1 = Buffer.concat([cipher1.update("evolution-api-key-secret-123", "utf8"), cipher1.final()]);
    const val1 = `${PREFIX_V1}${iv1.toString("base64url")}:${cipher1.getAuthTag().toString("base64url")}:${enc1.toString("base64url")}`;

    const oldKey = deriveKeyFromMaterial(KEY_OLD);
    const iv2 = crypto.randomBytes(12);
    const cipher2 = crypto.createCipheriv("aes-256-gcm", oldKey, iv2);
    const enc2 = Buffer.concat([cipher2.update("ha-token-secret-456", "utf8"), cipher2.final()]);
    const val2 = `${PREFIX_V1}${iv2.toString("base64url")}:${cipher2.getAuthTag().toString("base64url")}:${enc2.toString("base64url")}`;

    await prisma.setting.createMany({
      data: [
        { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}`, value: val1 },
        { userId: testUserId, key: `home_assistant_token_${runId}`, value: val2 },
        { userId: testUserId, key: `n8n_api_key_${runId}`, value: "n8n-plain-secret-789" },
        { userId: testUserId, key: `public_frontend_url_${runId}`, value: "https://frontend.example.invalid" }
      ]
    });
  });

  afterAll(async () => {
    try {
      if (testUserId) {
        await prisma.setting.deleteMany({ where: { userId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } });
      }
    } finally {
      await prisma.$disconnect();
      if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("não cria backup nem altera registros quando a identidade SQL do alvo não é aprovada", async () => {
    const existing = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}` } }
    });
    const before = await prisma.setting.findMany({ where: { userId: testUserId } });
    const alternateBackup = createSettingsBackupPayload([{
      id: existing.id,
      userId: existing.userId,
      key: existing.key,
      value: encryptSecret("synthetic-unapplied-restore-value"),
      updatedAt: new Date(existing.updatedAt.getTime() + 1_000)
    }], 1, 0);
    const lookalikeDatabase = new URL(databaseUrl!);
    lookalikeDatabase.pathname = "/testprod";
    const otherTestDatabase = new URL(databaseUrl!);
    otherTestDatabase.pathname = "/other_test";
    const wrongPort = new URL(databaseUrl!);
    wrongPort.port = "55434";
    const localAlias = new URL(databaseUrl!);
    localAlias.hostname = "localhost";
    const tunnelEndpoint = new URL(databaseUrl!);
    tunnelEndpoint.port = "15433";
    const wrongPassword = new URL(databaseUrl!);
    wrongPassword.password = "synthetic-wrong-password";
    const rejectedBackupDirectory = path.join(temporaryDirectory, "rejected-target-backups");
    const previousDatabaseUrl = env.DATABASE_URL;

    try {
      for (const rejectedUrl of [
        lookalikeDatabase,
        otherTestDatabase,
        wrongPort,
        localAlias,
        tunnelEndpoint,
        wrongPassword
      ]) {
        env.DATABASE_URL = rejectedUrl.toString();
        await expect(rotateAllSecretSettings({
          backupDir: rejectedBackupDirectory,
          userId: testUserId
        })).rejects.toThrow(/verified disposable PostgreSQL container identity/u);
        await expect(createSettingsBackup([{
          id: existing.id,
          userId: testUserId,
          key: existing.key,
          value: encryptSecret("synthetic-backup-must-not-be-written"),
          updatedAt: existing.updatedAt
        }], 1, 0, rejectedBackupDirectory))
          .rejects.toThrow(/verified disposable PostgreSQL container identity/u);
        await expect(restoreSettingsFromBackup(alternateBackup))
          .rejects.toThrow(/verified disposable PostgreSQL container identity/u);
      }
    } finally {
      env.DATABASE_URL = previousDatabaseUrl;
    }

    await expect(readdir(rejectedBackupDirectory)).rejects.toMatchObject({ code: "ENOENT" });
    const after = await prisma.setting.findMany({ where: { userId: testUserId } });
    expect(after.map((setting) => [setting.id, setting.key, setting.value, setting.updatedAt]))
      .toEqual(before.map((setting) => [setting.id, setting.key, setting.value, setting.updatedAt]));
  });

  it("simula a rotação sem alterar o banco ou criar backup", async () => {
    const report = await rotateAllSecretSettings({
      dryRun: true,
      userId: testUserId,
      backupDir: backupDirectory
    });

    expect(report.dryRun).toBe(true);
    expect(report.totalFound).toBe(3);
    expect(report.rotated).toBe(3);
    await expect(readdir(temporaryDirectory)).resolves.toEqual([]);

    const setting = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}` } }
    });
    expect(String(setting.value).startsWith(PREFIX_V1)).toBe(true);
  });

  it("cria backup cifrado antes da rotação atômica e preserva todas as configurações", async () => {
    const before = await prisma.setting.findMany({ where: { userId: testUserId } });
    const report = await rotateAllSecretSettings({
      userId: testUserId,
      backupDir: backupDirectory
    });

    expect(report.dryRun).toBe(false);
    expect(report.rotated).toBe(3);
    expect(report.backupFile).toBeDefined();

    const backupContent = await readFile(report.backupFile!, "utf8");
    expect(backupContent).not.toContain("evolution-api-key-secret-123");
    expect(backupContent).not.toContain("ha-token-secret-456");
    expect(backupContent).not.toContain("n8n-plain-secret-789");
    const backup = JSON.parse(backupContent) as { records: Array<{ value: string }> };
    expect(backup.records).toHaveLength(3);
    expect(backup.records.every((record) => isEncryptedSecret(record.value))).toBe(true);

    const rotated = await prisma.setting.findMany({ where: { userId: testUserId } });
    const byKey = new Map(rotated.map((setting) => [setting.key, setting]));
    const legacyEvolution = byKey.get(`whatsapp_evolution_api_key_${runId}`)!;
    const legacyHomeAssistant = byKey.get(`home_assistant_token_${runId}`)!;
    const plainN8n = byKey.get(`n8n_api_key_${runId}`)!;
    const publicUrl = byKey.get(`public_frontend_url_${runId}`)!;

    expect(String(legacyEvolution.value).startsWith(PREFIX_V2)).toBe(true);
    expect(String(legacyHomeAssistant.value).startsWith(PREFIX_V2)).toBe(true);
    expect(String(plainN8n.value).startsWith(PREFIX_V2)).toBe(true);
    expect(decryptSettingValue(legacyEvolution.key, legacyEvolution.value)).toBe("evolution-api-key-secret-123");
    expect(decryptSettingValue(legacyHomeAssistant.key, legacyHomeAssistant.value)).toBe("ha-token-secret-456");
    expect(decryptSettingValue(plainN8n.key, plainN8n.value)).toBe("n8n-plain-secret-789");
    expect(publicUrl.value).toBe("https://frontend.example.invalid");
    expect(rotated.find((setting) => setting.key === legacyEvolution.key)?.createdAt)
      .toEqual(before.find((setting) => setting.key === legacyEvolution.key)?.createdAt);
  });

  it("ignora registros atualizados em reexecuções sem criar backups adicionais", async () => {
    const report = await rotateAllSecretSettings({
      backupDir: backupDirectory,
      userId: testUserId
    });

    expect(report.rotated).toBe(0);
    expect(report.alreadyCurrent).toBe(3);
    await expect(readdir(backupDirectory)).resolves.toHaveLength(1);
  });

  it("mantém cifras v2 legíveis após a rotação independente de JWT_SECRET", async () => {
    env.JWT_SECRET = "another-synthetic-jwt-secret-after-rotation-000000";

    const setting = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}` } }
    });
    expect(decryptSettingValue(setting.key, setting.value)).toBe("evolution-api-key-secret-123");
  });

  it("restaura o backup gerado e recupera o estado pré-rotação sem texto puro", async () => {
    env.JWT_SECRET = KEY_LEGACY_JWT;
    const backupFile = (await readdir(backupDirectory))
      .map((filename) => path.join(backupDirectory, filename))
      .find((filename) => filename.endsWith(".json"));
    expect(backupFile).toBeDefined();

    const result = await restoreSettingsFromBackup(backupFile!);
    expect(result.restored).toBe(3);

    const evolution = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}` } }
    });
    const n8n = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `n8n_api_key_${runId}` } }
    });
    expect(evolution.value).toMatch(/^enc:v2:/);
    expect(decryptSettingValue(evolution.key, evolution.value)).toBe("evolution-api-key-secret-123");
    expect(n8n.value).toMatch(/^enc:v2:/);
    expect(decryptSettingValue(n8n.key, n8n.value)).toBe("n8n-plain-secret-789");
  });

  it("restaura backup autenticado usando somente a chave anterior configurada", async () => {
    const setting = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}` } }
    });
    const originalValue = String(setting.value);
    const previousPrimary = env.SETTINGS_ENCRYPTION_KEY;
    const previousOld = env.SETTINGS_ENCRYPTION_KEY_OLD;

    try {
      env.SETTINGS_ENCRYPTION_KEY = KEY_PRIMARY;
      env.SETTINGS_ENCRYPTION_KEY_OLD = "";
      const backup = createSettingsBackupPayload([{
        id: setting.id,
        userId: setting.userId,
        key: setting.key,
        value: encryptSecret("synthetic-old-key-restore-value"),
        updatedAt: setting.updatedAt
      }], 1, 0);
      env.SETTINGS_ENCRYPTION_KEY = "";
      env.SETTINGS_ENCRYPTION_KEY_OLD = KEY_PRIMARY;
      const result = await restoreSettingsFromBackup(backup);
      expect(result.restored).toBe(1);

      const restored = await prisma.setting.findUniqueOrThrow({ where: { id: setting.id } });
      expect(decryptSettingValue(restored.key, restored.value)).toBe("synthetic-old-key-restore-value");
    } finally {
      env.SETTINGS_ENCRYPTION_KEY = previousPrimary;
      env.SETTINGS_ENCRYPTION_KEY_OLD = previousOld;
      await prisma.setting.update({ where: { id: setting.id }, data: { value: originalValue } });
    }
  });

  it("rejeita um backup inválido antes de modificar o banco", async () => {
    const before = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}` } }
    });
    await expect(restoreSettingsFromBackup({
      version: 2,
      timestamp: new Date().toISOString(),
      totalSettings: 1,
      toRotateCount: 1,
      alreadyCurrentCount: 0,
      integrity: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      records: [{
        id: before.id,
        userId: testUserId,
        key: before.key,
        value: encryptSecret("synthetic-backup-secret"),
        updatedAt: before.updatedAt
      }]
    })).rejects.toThrow(/integridade do backup inválida/i);

    const after = await prisma.setting.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.value).toBe(before.value);
  });

  it("rejeita ciphertext adulterado ou transferido entre registros antes de alterar o banco", async () => {
    const backupFile = (await readdir(backupDirectory))
      .map((filename) => path.join(backupDirectory, filename))
      .find((filename) => filename.endsWith(".json"));
    expect(backupFile).toBeDefined();
    const originalBackup = JSON.parse(await readFile(backupFile!, "utf8")) as {
      records: Array<{ id: string; userId: string; key: string; value: string; updatedAt: string }>;
    };
    const before = await prisma.setting.findMany({ where: { userId: testUserId } });
    expect(originalBackup.records.length).toBeGreaterThan(1);

    const alteredCiphertext = structuredClone(originalBackup);
    const cipherParts = alteredCiphertext.records[0].value.split(":");
    cipherParts[3] = `${cipherParts[3][0] === "A" ? "B" : "A"}${cipherParts[3].slice(1)}`;
    alteredCiphertext.records[0].value = cipherParts.join(":");

    const swappedCiphertexts = structuredClone(originalBackup);
    [swappedCiphertexts.records[0].value, swappedCiphertexts.records[1].value] =
      [swappedCiphertexts.records[1].value, swappedCiphertexts.records[0].value];

    const alteredIdentity = structuredClone(originalBackup);
    alteredIdentity.records[0].key = `another_secret_${runId}`;

    for (const tamperedBackup of [alteredCiphertext, swappedCiphertexts, alteredIdentity]) {
      await expect(restoreSettingsFromBackup(tamperedBackup))
        .rejects.toThrow(/integridade do backup inválida/i);
    }

    const after = await prisma.setting.findMany({ where: { userId: testUserId } });
    expect(after.map((setting) => [setting.id, setting.key, setting.value])).toEqual(
      before.map((setting) => [setting.id, setting.key, setting.value])
    );
  });

  it("reverte todas as atualizações se uma gravação falhar após o backup", async () => {
    const homeAssistantSetting = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `home_assistant_token_${runId}` } }
    });
    const legacyIv = crypto.randomBytes(12);
    const legacyCipher = crypto.createCipheriv("aes-256-gcm", deriveKeyFromMaterial(KEY_OLD), legacyIv);
    const legacyValue = Buffer.concat([
      legacyCipher.update("ha-token-secret-456", "utf8"),
      legacyCipher.final()
    ]);
    await prisma.setting.update({
      where: { id: homeAssistantSetting.id },
      data: {
        value: `${PREFIX_V1}${legacyIv.toString("base64url")}:${legacyCipher.getAuthTag().toString("base64url")}:${legacyValue.toString("base64url")}`
      }
    });

    const before = await prisma.setting.findMany({ where: { userId: testUserId } });
    const backupFilesBefore = await readdir(backupDirectory);

    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION sec002_reject_rotation()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.key LIKE 'home_assistant_token_%' THEN
          RAISE EXCEPTION 'synthetic SEC-002 update failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    await prisma.$executeRaw`
      CREATE TRIGGER sec002_reject_rotation
      BEFORE UPDATE OF value ON "Setting"
      FOR EACH ROW EXECUTE FUNCTION sec002_reject_rotation()
    `;

    try {
      await expect(rotateAllSecretSettings({
        backupDir: backupDirectory,
        userId: testUserId
      })).rejects.toThrow();
    } finally {
      await prisma.$executeRaw`DROP TRIGGER IF EXISTS sec002_reject_rotation ON "Setting"`;
      await prisma.$executeRaw`DROP FUNCTION IF EXISTS sec002_reject_rotation()`;
    }

    const after = await prisma.setting.findMany({ where: { userId: testUserId } });
    expect(after.map((setting) => [setting.id, setting.value])).toEqual(
      before.map((setting) => [setting.id, setting.value])
    );

    const backupFilesAfter = await readdir(backupDirectory);
    expect(backupFilesAfter).toHaveLength(backupFilesBefore.length + 1);
    const createdBackup = backupFilesAfter.find((filename) => !backupFilesBefore.includes(filename));
    expect(createdBackup).toBeDefined();
    const backupContent = await readFile(path.join(backupDirectory, createdBackup!), "utf8");
    expect(backupContent).not.toContain("evolution-api-key-secret-123");
    expect(backupContent).not.toContain("ha-token-secret-456");
    expect(backupContent).not.toContain("n8n-plain-secret-789");
  });

  it("aborta sem alteração ou backup quando um registro cifrado não pode ser decifrado", async () => {
    const valid = await prisma.setting.findUniqueOrThrow({
      where: { userId_key: { userId: testUserId, key: `home_assistant_token_${runId}` } }
    });
    await prisma.setting.update({
      where: { userId_key: { userId: testUserId, key: `whatsapp_evolution_api_key_${runId}` } },
      data: { value: "enc:v2:badiv:badtag:badciphertext" }
    });

    const backupFilesBefore = await readdir(backupDirectory);
    await expect(rotateAllSecretSettings({
      backupDir: backupDirectory,
      userId: testUserId
    })).rejects.toThrow(/Falha ao decifrar/i);

    const validAfter = await prisma.setting.findUniqueOrThrow({ where: { id: valid.id } });
    expect(validAfter.value).toBe(valid.value);
    await expect(readdir(backupDirectory)).resolves.toEqual(backupFilesBefore);
  });
});
