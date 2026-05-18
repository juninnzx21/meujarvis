import type { Prisma } from "@prisma/client";
import { env } from "../src/config/env.js";
import { prisma } from "../src/prisma/client.js";
import { decryptSettingValue, encryptSettingValue, isSecretSettingKey } from "../src/services/encryptionService.js";
import { writeSystemLog } from "../src/services/systemLogService.js";

const sourceEmail = argValue("--source") || "admin@jarvis.local";
const targetEmail = argValue("--target") || process.argv[2];
const includeEnvFallback = process.argv.includes("--include-env-fallback");

const safeSettingKeys = [
  "public_frontend_url",
  "public_api_url",
  "public_whatsapp_webhook_url",
  "public_n8n_url",
  "backup_offsite_enabled",
  "monitoring_alerts_enabled",
  "n8n_webhook_url",
  "n8n_api_key",
  "n8n_enabled",
  "n8n_webhook_secret",
  "whatsapp_evolution_api_url",
  "whatsapp_evolution_api_key",
  "whatsapp_evolution_instance",
  "whatsapp_auto_reply",
  "home_assistant_url",
  "home_assistant_token",
  "finance_api_url",
  "finance_api_token",
  "finance_user_email",
  "finance_default_account_name"
] as const;

const productionDefaults: Record<string, Prisma.InputJsonValue> = {
  public_frontend_url: "https://jarvis.juninnzxtec.com.br",
  public_api_url: "https://apijarvis.juninnzxtec.com.br/api",
  public_whatsapp_webhook_url: "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook",
  public_n8n_url: "https://n8njarvis.juninnzxtec.com.br",
  whatsapp_auto_reply: false,
  n8n_enabled: true,
  backup_offsite_enabled: false,
  monitoring_alerts_enabled: false,
  finance_default_account_name: "PJ DO INTER"
};

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function envFallbacks(): Record<string, string | boolean> {
  if (!includeEnvFallback) return {};
  return {
    n8n_webhook_url: env.N8N_WEBHOOK_URL,
    n8n_api_key: env.N8N_API_KEY,
    n8n_enabled: true,
    whatsapp_evolution_api_url: env.EVOLUTION_API_URL,
    whatsapp_evolution_api_key: env.EVOLUTION_API_KEY,
    whatsapp_evolution_instance: env.EVOLUTION_INSTANCE,
    whatsapp_auto_reply: env.WHATSAPP_AUTO_REPLY,
    home_assistant_url: env.HOME_ASSISTANT_URL,
    home_assistant_token: env.HOME_ASSISTANT_TOKEN
  };
}

async function main() {
  if (!targetEmail) {
    throw new Error("Informe o e-mail destino. Exemplo: npm run sync:settings -- --target usuario@email.com");
  }

  const [sourceUser, targetUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: sourceEmail } }),
    prisma.user.findUnique({ where: { email: targetEmail } })
  ]);

  if (!sourceUser) throw new Error(`Conta fonte nao encontrada: ${sourceEmail}`);
  if (!targetUser) throw new Error(`Conta destino nao encontrada: ${targetEmail}`);

  const sourceRows = await prisma.setting.findMany({
    where: { userId: sourceUser.id, key: { in: [...safeSettingKeys] } }
  });
  const sourceMap = new Map(sourceRows.map((row) => [row.key, row.value]));
  const fallbackMap = envFallbacks();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const key of safeSettingKeys) {
    const sourceValue = sourceMap.get(key) ?? fallbackMap[key] ?? productionDefaults[key];
    if (sourceValue === undefined || sourceValue === null || sourceValue === "") {
      skipped += 1;
      continue;
    }

    const value = normalizeValue(key, sourceValue);
    const existing = await prisma.setting.findUnique({
      where: { userId_key: { userId: targetUser.id, key } }
    });

    await prisma.setting.upsert({
      where: { userId_key: { userId: targetUser.id, key } },
      update: { value },
      create: { userId: targetUser.id, key, value }
    });

    if (existing) updated += 1;
    else created += 1;
  }

  await writeSystemLog({
    userId: targetUser.id,
    module: "settings",
    action: "sync_user_integration_settings",
    message: "Configuracoes de integracao sincronizadas para usuario de producao",
    metadata: {
      sourceEmail,
      targetEmail,
      created,
      updated,
      skipped,
      includeEnvFallback,
      copiedKeys: safeSettingKeys.length,
      secretsRedacted: true
    }
  });

  console.log(`sync completed. source=${sourceEmail} target=${targetEmail} created=${created} updated=${updated} skipped=${skipped} total=${safeSettingKeys.length}`);
}

function normalizeValue(key: string, value: unknown): Prisma.InputJsonValue {
  if (isSecretSettingKey(key) && typeof value === "string") {
    const plain = decryptSettingValue(key, value);
    return encryptSettingValue(key, plain) as Prisma.InputJsonValue;
  }
  return value as Prisma.InputJsonValue;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Falha ao sincronizar configuracoes.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
