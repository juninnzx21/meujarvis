import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";

export const NVIDIA_ZERO_SPEND_POLICY_KEY = "nvidia_zero_spend_policy_v1";

/**
 * This policy is intentionally immutable in this release. The application has
 * no trusted account-level proof of NVIDIA quota, entitlement, or a hard spend
 * ceiling, so every hosted or potentially billable NVIDIA operation is denied.
 */
export const NVIDIA_ZERO_SPEND_POLICY = Object.freeze({
  name: "NVIDIA_ZERO_SPEND",
  version: 1,
  budgetMonthlyBrl: 0,
  billingPeriod: "calendar_month",
  timezone: "America/Sao_Paulo",
  paidRequestsAllowed: false,
  unknownQuotaBehavior: "BLOCK",
  unknownPricingBehavior: "BLOCK",
  unknownEntitlementBehavior: "BLOCK",
  autoFallbackToPaidProvider: false,
  automaticPaidTopup: false,
  operations: Object.freeze({
    llm: Object.freeze({ provider: "nvidia", model: null as string | null, endpoint: "https://integrate.api.nvidia.com/v1/chat/completions", enabled: false }),
    stt: Object.freeze({ provider: "nvidia", model: "whisper-large-v3", endpoint: "private-self-hosted-nim", enabled: false }),
    tts: Object.freeze({ provider: "nvidia", model: "magpie-tts-multilingual", endpoint: "NVIDIA Cloud Functions Magpie", enabled: false })
  })
});

type SettingWriter = Pick<Prisma.TransactionClient, "setting">;

export async function persistNvidiaZeroSpendPolicy(tx: SettingWriter, userId: string) {
  const [model, sttEndpoint] = await Promise.all([
    tx.setting.findUnique({ where: { userId_key: { userId, key: "nvidia_model" } }, select: { value: true } }),
    tx.setting.findUnique({ where: { userId_key: { userId, key: "nvidia_stt_base_url" } }, select: { value: true } })
  ]);
  const persistedPolicy = {
    ...NVIDIA_ZERO_SPEND_POLICY,
    operations: {
      llm: { ...NVIDIA_ZERO_SPEND_POLICY.operations.llm, model: typeof model?.value === "string" ? model.value : null },
      stt: { ...NVIDIA_ZERO_SPEND_POLICY.operations.stt, endpoint: typeof sttEndpoint?.value === "string" && sttEndpoint.value ? sttEndpoint.value : "private-self-hosted-nim" },
      tts: NVIDIA_ZERO_SPEND_POLICY.operations.tts
    }
  };
  await tx.setting.upsert({
    where: { userId_key: { userId, key: NVIDIA_ZERO_SPEND_POLICY_KEY } },
    update: { value: persistedPolicy },
    create: { userId, key: NVIDIA_ZERO_SPEND_POLICY_KEY, value: persistedPolicy }
  });
}

function currentBillingPeriodKey() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: NVIDIA_ZERO_SPEND_POLICY.timezone, year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "unknown";
  const month = parts.find((part) => part.type === "month")?.value || "unknown";
  return `${year}-${month}`;
}

export async function getNvidiaZeroSpendStatus(userId: string) {
  const saved = await prisma.setting.findUnique({
    where: { userId_key: { userId, key: NVIDIA_ZERO_SPEND_POLICY_KEY } },
    select: { value: true }
  });
  const policy = saved?.value && typeof saved.value === "object" && !Array.isArray(saved.value)
    ? saved.value as Record<string, unknown>
    : undefined;
  const operations = policy?.operations && typeof policy.operations === "object" && !Array.isArray(policy.operations)
    ? policy.operations as Record<string, unknown>
    : undefined;
  const allOperationsDisabled = (Object.keys(NVIDIA_ZERO_SPEND_POLICY.operations) as Array<keyof typeof NVIDIA_ZERO_SPEND_POLICY.operations>)
    .every((operation) => {
      const entry = operations?.[operation];
      return Boolean(entry && typeof entry === "object" && !Array.isArray(entry)
        && (entry as Record<string, unknown>).enabled === false);
    });
  const persisted = Boolean(policy
    && policy.name === NVIDIA_ZERO_SPEND_POLICY.name
    && policy.version === NVIDIA_ZERO_SPEND_POLICY.version
    && policy.budgetMonthlyBrl === 0
    && policy.billingPeriod === "calendar_month"
    && policy.timezone === "America/Sao_Paulo"
    && policy.paidRequestsAllowed === false
    && policy.unknownQuotaBehavior === "BLOCK"
    && policy.unknownPricingBehavior === "BLOCK"
    && policy.unknownEntitlementBehavior === "BLOCK"
    && policy.autoFallbackToPaidProvider === false
    && policy.automaticPaidTopup === false
    && allOperationsDisabled);
  return {
    name: NVIDIA_ZERO_SPEND_POLICY.name,
    status: "CONFIGURED_BUT_BILLING_UNVERIFIED" as const,
    policyPersisted: persisted,
    blocked: true as const,
    budgetMonthlyBrl: 0,
    billingPeriod: NVIDIA_ZERO_SPEND_POLICY.billingPeriod,
    timezone: NVIDIA_ZERO_SPEND_POLICY.timezone,
    paidRequestsAllowed: false as const,
    automaticPaidFallbackAllowed: false as const,
    message: persisted
      ? "Orçamento NVIDIA definido em R$ 0,00. Inferência, fala e transcrição permanecem bloqueadas até comprovação confiável de quota, preço e entitlement sem cobrança."
      : "Política NVIDIA de R$ 0,00 ausente ou divergente. Operação bloqueada por segurança; salve novamente a configuração NVIDIA para registrar a política."
  };
}

export async function recordNvidiaZeroSpendBlock(userId: string | undefined, operation: keyof typeof NVIDIA_ZERO_SPEND_POLICY.operations, model?: string) {
  await writeSystemLog({
    userId,
    level: "warning",
    module: "ai",
    action: "nvidia_zero_spend_blocked",
    message: "Operação NVIDIA bloqueada pela política de orçamento zero.",
    metadata: {
      policy: NVIDIA_ZERO_SPEND_POLICY.name,
      policyVersion: NVIDIA_ZERO_SPEND_POLICY.version,
      operation,
      model: model || null,
      budgetMonthlyBrl: 0,
      billingPeriod: NVIDIA_ZERO_SPEND_POLICY.billingPeriod,
      billingPeriodKey: currentBillingPeriodKey(),
      timezone: NVIDIA_ZERO_SPEND_POLICY.timezone,
      decision: "BLOCK"
    }
  });
}
