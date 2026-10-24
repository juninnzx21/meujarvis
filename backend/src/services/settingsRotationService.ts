import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { assertDisposablePostgresConnection } from "../test-utils/disposablePostgres.js";
import { logger } from "../utils/logger.js";
import {
  decryptSecret,
  encryptSecret,
  createSettingsBackupIntegrity,
  getSecretEncryptionVersion,
  isEncryptedSecret,
  isSecretSettingKey,
  needsReEncryption,
  verifySettingsBackupIntegrity
} from "./encryptionService.js";

export interface SettingBackupRecord {
  id: string;
  userId: string;
  key: string;
  value: string;
  updatedAt: Date;
}

export interface SettingBackup {
  version: 2;
  timestamp: string;
  totalSettings: number;
  toRotateCount: number;
  alreadyCurrentCount: number;
  records: SettingBackupRecord[];
  integrity: string;
}

export interface RotationResult {
  dryRun: boolean;
  totalFound: number;
  rotated: number;
  alreadyCurrent: number;
  backupFile?: string;
  records: Array<{
    id: string;
    key: string;
    userId: string;
    previousVersion: string;
    newVersion: string;
  }>;
}

const defaultBackupDir = path.resolve(process.cwd(), "storage", "backups");
const backupRecordSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  key: z.string().min(1).refine(isSecretSettingKey),
  value: z.string().refine((value) =>
    isEncryptedSecret(value) && getSecretEncryptionVersion(value) === "v2"
  ),
  updatedAt: z.coerce.date()
}).strict();

const backupSchema = z.object({
  version: z.literal(2),
  timestamp: z.string().datetime(),
  totalSettings: z.number().int().nonnegative(),
  toRotateCount: z.number().int().nonnegative(),
  alreadyCurrentCount: z.number().int().nonnegative(),
  records: z.array(backupRecordSchema),
  integrity: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
}).strict().superRefine((backup, context) => {
  if (backup.totalSettings !== backup.records.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Contagem de registros inconsistente." });
  }
  if (backup.toRotateCount + backup.alreadyCurrentCount !== backup.totalSettings) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Contagens da rotação inconsistentes." });
  }
  const ids = new Set(backup.records.map((record) => record.id));
  if (ids.size !== backup.records.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Backup contém registros duplicados." });
  }
});

function serializeBackupPayload(backup: Omit<SettingBackup, "integrity">): string {
  return JSON.stringify({
    version: backup.version,
    timestamp: backup.timestamp,
    totalSettings: backup.totalSettings,
    toRotateCount: backup.toRotateCount,
    alreadyCurrentCount: backup.alreadyCurrentCount,
    records: backup.records.map((record) => ({
      id: record.id,
      userId: record.userId,
      key: record.key,
      value: record.value,
      updatedAt: record.updatedAt.toISOString()
    }))
  });
}

type SettingsRotationClient = typeof prisma | Prisma.TransactionClient;

export async function assertSettingsRotationTargetDisposable(
  client: SettingsRotationClient = prisma
): Promise<void> {
  await assertDisposablePostgresConnection(env.DATABASE_URL, () => client.$queryRaw`
    SELECT current_database() AS "database",
      current_user AS "role",
      inet_server_addr()::text AS "serverAddress",
      inet_server_port() AS "serverPort"
  `);
}

interface StoredSetting {
  id: string;
  userId: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

interface SecretSetting extends StoredSetting {
  value: string;
}

interface RotationPlan {
  setting: SecretSetting;
  newValue: string;
  backupValue: string;
  previousVersion: string;
}

function buildRotationPlan(settings: StoredSetting[]) {
  const secretSettings = settings.filter((setting): setting is SecretSetting =>
    isSecretSettingKey(setting.key) &&
    typeof setting.value === "string" &&
    setting.value.length > 0
  );
  const plans: RotationPlan[] = [];
  const alreadyCurrent: SecretSetting[] = [];

  for (const setting of secretSettings) {
    const previousVersion = getSecretEncryptionVersion(setting.value);
    if (previousVersion === "unsupported") {
      throw new Error(
        `Formato de cifragem não suportado para configuração protegida '${setting.key}' (ID: ${setting.id}); rotação abortada.`
      );
    }

    if (isEncryptedSecret(setting.value) && !needsReEncryption(setting.value)) {
      alreadyCurrent.push(setting);
      continue;
    }

    const plain = isEncryptedSecret(setting.value) ? decryptSecret(setting.value) : setting.value;
    if (!plain) {
      throw new Error(
        `Falha ao decifrar configuração protegida '${setting.key}' (ID: ${setting.id}); rotação abortada para evitar corrupção de dados.`
      );
    }

    const newValue = encryptSecret(plain);
    plans.push({
      setting,
      newValue,
      backupValue: newValue,
      previousVersion
    });
  }

  return { secretSettings, plans, alreadyCurrent };
}

export function createSettingsBackupPayload(
  records: SettingBackupRecord[],
  toRotateCount: number,
  alreadyCurrentCount: number
): SettingBackup {
  if (records.some((record) => !decryptSecret(record.value))) {
    throw new Error("Backup contém configuração protegida inválida ou não decifrável.");
  }
  const payload: Omit<SettingBackup, "integrity"> = {
    version: 2,
    timestamp: new Date().toISOString(),
    totalSettings: records.length,
    toRotateCount,
    alreadyCurrentCount,
    records
  };
  return backupSchema.parse({
    ...payload,
    integrity: createSettingsBackupIntegrity(serializeBackupPayload(payload))
  });
}

async function writeSettingsBackup(
  records: SettingBackupRecord[],
  toRotateCount: number,
  alreadyCurrentCount: number,
  backupDir = defaultBackupDir
): Promise<{ backupFile: string; backupData: SettingBackup }> {
  const validatedBackup = createSettingsBackupPayload(records, toRotateCount, alreadyCurrentCount);
  const timestamp = validatedBackup.timestamp;
  await mkdir(backupDir, { recursive: true });

  const filename = `settings-backup-${timestamp.replace(/[:.]/g, "-")}-${randomUUID()}.json`;
  const backupFile = path.join(backupDir, filename);
  const handle = await open(backupFile, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(validatedBackup, null, 2), "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(backupFile).catch((cleanupError: unknown) => {
      logger.warn({ error: cleanupError instanceof Error ? cleanupError.message : "erro" }, "Não foi possível remover backup incompleto");
    });
    throw error;
  }
  await handle.close();
  logger.info({ backupFile, totalSettings: records.length }, "Backup de settings criado com sucesso antes da rotação");
  return { backupFile, backupData: validatedBackup };
}

export async function createSettingsBackup(
  records: SettingBackupRecord[],
  toRotateCount: number,
  alreadyCurrentCount: number,
  backupDir = defaultBackupDir
): Promise<{ backupFile: string; backupData: SettingBackup }> {
  await assertSettingsRotationTargetDisposable();
  return writeSettingsBackup(records, toRotateCount, alreadyCurrentCount, backupDir);
}

export async function rotateAllSecretSettings(options: {
  dryRun?: boolean;
  backupDir?: string;
  userId?: string;
} = {}): Promise<RotationResult> {
  await assertSettingsRotationTargetDisposable();
  const isDryRun = options.dryRun ?? false;
  const where = options.userId ? { userId: options.userId } : undefined;
  const runRotation = async (client: typeof prisma | Prisma.TransactionClient) => {
    // Verify the very connection that will read/write settings, not only a preflight connection.
    await assertSettingsRotationTargetDisposable(client);
    const settings = await client.setting.findMany({ where });
    const { secretSettings, plans, alreadyCurrent } = buildRotationPlan(settings);
    const backupRecords: SettingBackupRecord[] = secretSettings.flatMap((setting) => {
      if (typeof setting.value !== "string" || !setting.value) return [];
      const planned = plans.find((item) => item.setting.id === setting.id);
      return [{
        id: setting.id,
        userId: setting.userId,
        key: setting.key,
        value: planned?.backupValue ?? setting.value,
        updatedAt: setting.updatedAt
      }];
    });

    let backupFile: string | undefined;
    if (!isDryRun && plans.length > 0) {
      // Keep the identity check immediately adjacent to the first filesystem side effect.
      await assertSettingsRotationTargetDisposable(client);
      const backup = await writeSettingsBackup(
        backupRecords,
        plans.length,
        alreadyCurrent.length,
        options.backupDir
      );
      backupFile = backup.backupFile;

      if (client === prisma) throw new Error("Transação necessária para executar a rotação.");
      await Promise.all(plans.map((item) =>
        client.setting.update({
          where: { id: item.setting.id },
          data: { value: item.newValue }
        })
      ));
    }

    return {
      dryRun: isDryRun,
      totalFound: secretSettings.length,
      rotated: plans.length,
      alreadyCurrent: alreadyCurrent.length,
      backupFile,
      records: plans.map((item) => ({
        id: item.setting.id,
        key: item.setting.key,
        userId: item.setting.userId,
        previousVersion: item.previousVersion,
        newVersion: "v2"
      }))
    };
  };

  if (isDryRun) return runRotation(prisma);
  const result = await prisma.$transaction(
    (transaction) => runRotation(transaction),
    { isolationLevel: "Serializable" }
  );
  if (result.rotated > 0) {
    logger.info(
      { rotated: result.rotated, alreadyCurrent: result.alreadyCurrent },
      "Rotação de chaves de settings concluída com sucesso em transação atômica"
    );
  }
  return result;
}

export async function restoreSettingsFromBackup(
  backupOrPath: unknown
): Promise<{ restored: number }> {
  let input: unknown = backupOrPath;
  if (typeof backupOrPath === "string") {
    try {
      input = JSON.parse(await readFile(backupOrPath, "utf8")) as unknown;
    } catch {
      throw new Error("Não foi possível ler o arquivo de backup de settings.");
    }
  }

  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) throw new Error("Formato de backup inválido para restauração de settings.");
  const backup = parsed.data;
  const { integrity, ...payload } = backup;
  if (!verifySettingsBackupIntegrity(serializeBackupPayload(payload), integrity)) {
    throw new Error("Integridade do backup inválida para restauração de settings.");
  }
  if (backup.records.some((record) => !decryptSecret(record.value))) {
    throw new Error("Backup contém configuração protegida inválida ou não decifrável.");
  }

  await assertSettingsRotationTargetDisposable();
  await prisma.$transaction(async (transaction) => {
    // Confirm the target through the same pinned connection used for restoration.
    await assertSettingsRotationTargetDisposable(transaction);
    for (const record of backup.records) {
      const result = await transaction.setting.updateMany({
        where: { id: record.id, userId: record.userId, key: record.key },
        data: { value: record.value, updatedAt: record.updatedAt }
      });
      if (result.count !== 1) {
        throw new Error("Backup não corresponde ao estado atual; restauração atômica abortada.");
      }
    }
  }, { isolationLevel: "Serializable" });

  logger.info({ restored: backup.records.length }, "Restauração de settings concluída com sucesso a partir de backup");
  return { restored: backup.records.length };
}
