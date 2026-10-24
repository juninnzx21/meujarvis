import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptSecret } from "./encryptionService.js";
import {
  createSettingsBackupPayload,
  restoreSettingsFromBackup
} from "./settingsRotationService.js";

describe("SEC-002: backup integrity", () => {
  it("rejects unsigned v1 backups before opening a database transaction", async () => {
    await expect(restoreSettingsFromBackup({
      version: 1,
      timestamp: new Date().toISOString(),
      totalSettings: 0,
      toRotateCount: 0,
      alreadyCurrentCount: 0,
      records: []
    })).rejects.toThrow(/formato de backup inválido/i);
  });

  it("rejects an invalid ciphertext before constructing a backup payload", () => {
    expect(() => createSettingsBackupPayload([{
      id: randomUUID(),
      userId: randomUUID(),
      key: "synthetic_api_key",
      value: "enc:v2:bad:bad:bad",
      updatedAt: new Date()
    }], 1, 0)).toThrow(/inválida ou não decifrável/i);
  });

  it("rejects ciphertext or identity tampering before opening a database transaction", async () => {
    const payload = createSettingsBackupPayload([{
      id: randomUUID(),
      userId: randomUUID(),
      key: "synthetic_api_key",
      value: encryptSecret("synthetic-backup-secret"),
      updatedAt: new Date()
    }], 1, 0);
    const backup = structuredClone(payload) as {
      records: Array<{ id: string; userId: string; key: string; value: string }>;
    };

    const alteredCiphertext = structuredClone(backup);
    const parts = alteredCiphertext.records[0].value.split(":");
    parts[3] = `${parts[3][0] === "A" ? "B" : "A"}${parts[3].slice(1)}`;
    alteredCiphertext.records[0].value = parts.join(":");

    const alteredIdentity = structuredClone(backup);
    alteredIdentity.records[0].key = "different_api_key";

    for (const tamperedBackup of [alteredCiphertext, alteredIdentity]) {
      await expect(restoreSettingsFromBackup(tamperedBackup))
        .rejects.toThrow(/integridade do backup inválida/i);
    }
  });
});
