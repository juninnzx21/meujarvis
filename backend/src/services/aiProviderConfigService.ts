import { env } from "../config/env.js";
import { z } from "zod";
import { prisma } from "../prisma/client.js";
import { decryptSettingValue, encryptSettingValue } from "./encryptionService.js";
import { normalizePrivateOllamaUrl } from "./ollamaUrl.js";
import { persistNvidiaZeroSpendPolicy } from "./nvidiaBillingPolicyService.js";

export type AiProvider = "openai" | "gemini" | "nvidia" | "ollama";
export type AiPrimaryProvider = "auto" | AiProvider;

const aiPrimaryProviderSettingKey = "ai_primary_provider";
const aiPrimaryProviderSchema = z.object({
  primaryProvider: z.enum(["auto", "openai", "gemini", "nvidia", "ollama"]),
  fallbackProviders: z.array(z.enum(["openai", "gemini", "nvidia", "ollama"])).max(4).optional()
}).strict();

export async function getAiPrimaryProvider(userId?: string): Promise<AiPrimaryProvider> {
  if (!userId) return "auto";
  const setting = await prisma.setting.findUnique({
    where: { userId_key: { userId, key: aiPrimaryProviderSettingKey } },
    select: { value: true }
  });
  const value = stringValue(setting?.value);
  return value === "openai" || value === "gemini" || value === "nvidia" || value === "ollama" ? value : "auto";
}

const aiFallbackSettingKey = "ai_fallback_providers";
const aiProviderValues = ["openai", "gemini", "nvidia", "ollama"] as const;
export async function getAiProviderOrder(userId?: string): Promise<AiProvider[]> {
  const primary = await getAiPrimaryProvider(userId);
  const defaults: AiProvider[] = primary === "openai" ? ["gemini", "ollama", "nvidia"]
    : primary === "gemini" ? ["ollama", "openai", "nvidia"]
      : primary === "nvidia" ? ["ollama", "openai", "gemini"]
        : primary === "ollama" ? ["openai", "gemini", "nvidia"] : ["ollama", "openai", "gemini", "nvidia"];
  if (!userId) return primary === "auto" ? defaults : [primary, ...defaults];
  const setting = await prisma.setting.findUnique({ where: { userId_key: { userId, key: aiFallbackSettingKey } }, select: { value: true } });
  const configured = Array.isArray(setting?.value) ? setting.value.filter((value): value is AiProvider => aiProviderValues.includes(value as AiProvider)) : [];
  const fallbacks = setting ? [...new Set(configured)] : defaults;
  return primary === "auto" ? fallbacks : [primary, ...fallbacks.filter((provider) => provider !== primary)];
}

export async function saveAiPrimaryProvider(userId: string, rawInput: unknown) {
  const { primaryProvider, fallbackProviders } = aiPrimaryProviderSchema.parse(rawInput);
  await prisma.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { userId_key: { userId, key: aiPrimaryProviderSettingKey } },
      update: { value: primaryProvider },
      create: { userId, key: aiPrimaryProviderSettingKey, value: primaryProvider }
    });
    if (fallbackProviders) {
      const uniqueFallbacks = [...new Set(fallbackProviders)].filter((provider) => provider !== primaryProvider);
      await tx.setting.upsert({
        where: { userId_key: { userId, key: aiFallbackSettingKey } },
        update: { value: uniqueFallbacks },
        create: { userId, key: aiFallbackSettingKey, value: uniqueFallbacks }
      });
    }
    if (primaryProvider === "nvidia") await persistNvidiaZeroSpendPolicy(tx, userId);
  });
  return primaryProvider;
}

const providerInputSchema = z.object({
  apiKey: z.string().trim().max(300).optional(),
  model: z.string().trim().max(120).optional(),
  removeApiKey: z.boolean().optional()
}).strict();

const providerSettings = {
  openai: { apiKey: "openai_api_key", model: "openai_model", envKey: env.OPENAI_API_KEY, envModel: env.OPENAI_MODEL },
  gemini: { apiKey: "gemini_api_key", model: "gemini_model", envKey: env.GEMINI_API_KEY, envModel: env.GEMINI_MODEL },
  nvidia: { apiKey: "nvidia_api_key", model: "nvidia_model", envKey: "", envModel: "qwen/qwen3-next-80b-a3b-instruct" },
  ollama: { apiKey: "ollama_api_key", model: "ollama_model", envKey: "", envModel: "llama3.2:3b" }
} as const;

const ollamaUrlSettingKey = "ollama_base_url";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function invalidOllamaConfig(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 400 });
}

export async function getAiProviderConfig(
  provider: AiProvider,
  userId?: string,
  options: { allowEnvironmentFallback?: boolean } = {}
) {
  const keys = providerSettings[provider];
  let storedKey = "";
  let storedModel = "";

  if (userId) {
    const rows = await prisma.setting.findMany({
      where: { userId, key: { in: [keys.apiKey, keys.model] } },
      select: { key: true, value: true }
    });
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    storedKey = stringValue(decryptSettingValue(keys.apiKey, settings[keys.apiKey]));
    storedModel = stringValue(settings[keys.model]);
  }

  const environmentFallbackAllowed = options.allowEnvironmentFallback !== false;
  const apiKey = storedKey || (environmentFallbackAllowed ? keys.envKey : "");
  return {
    apiKey,
    model: storedModel || (environmentFallbackAllowed ? keys.envModel : ""),
    configured: Boolean(apiKey),
    source: storedKey ? "painel" as const : environmentFallbackAllowed && keys.envKey ? "ambiente" as const : "ausente" as const
  };
}

export async function getOllamaConfig(userId?: string) {
  if (!userId) return { baseUrl: "", model: providerSettings.ollama.envModel, configured: false, source: "ausente" as const };
  const rows = await prisma.setting.findMany({
    where: { userId, key: { in: [ollamaUrlSettingKey, providerSettings.ollama.model] } },
    select: { key: true, value: true }
  });
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const baseUrl = stringValue(settings[ollamaUrlSettingKey]);
  return {
    baseUrl,
    model: stringValue(settings[providerSettings.ollama.model]) || providerSettings.ollama.envModel,
    configured: Boolean(baseUrl),
    source: baseUrl ? "painel" as const : "ausente" as const
  };
}

export async function saveOllamaConfig(userId: string, rawInput: unknown) {
  const input = z.object({
    baseUrl: z.string().trim().max(300),
    model: z.string().trim().min(1).max(120)
  }).strict().parse(rawInput);
  let baseUrl = "";
  try { baseUrl = normalizePrivateOllamaUrl(input.baseUrl); }
  catch (error) { return invalidOllamaConfig(error instanceof Error ? error.message : "URL do Ollama inválida."); }
  if (input.model && !/^[a-zA-Z0-9._:-]+$/.test(input.model)) invalidOllamaConfig("O identificador do modelo contém caracteres inválidos.");
  if (baseUrl) {
    let url: URL;
    try { url = new URL(baseUrl); } catch { return invalidOllamaConfig("URL do Ollama inválida."); }
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) invalidOllamaConfig("Informe apenas a URL base privada do Ollama.");
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const ipv4 = host.split(".").map(Number);
    const isIpv4 = ipv4.length === 4 && ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
    const privateIpv4 = isIpv4 && (
      ipv4[0] === 10 || ipv4[0] === 127 ||
      (ipv4[0] === 192 && ipv4[1] === 168) ||
      (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
      (ipv4[0] === 100 && ipv4[1] >= 64 && ipv4[1] <= 127)
    );
    const privateIpv6 = host === "::1" || host.startsWith("fc") || host.startsWith("fd");
    const localName = host === "localhost" || host === "ollama";
    if (!(["http:", "https:"].includes(url.protocol) && (privateIpv4 || privateIpv6 || localName))) {
      invalidOllamaConfig("Ollama deve usar localhost ou um IP privado literal (LAN/VPN); URLs públicas não são permitidas.");
    }
  }
  await prisma.setting.upsert({
    where: { userId_key: { userId, key: ollamaUrlSettingKey } },
    update: { value: baseUrl },
    create: { userId, key: ollamaUrlSettingKey, value: baseUrl }
  });
  await prisma.setting.upsert({
    where: { userId_key: { userId, key: providerSettings.ollama.model } },
    update: { value: input.model },
    create: { userId, key: providerSettings.ollama.model, value: input.model }
  });
  return getOllamaConfig(userId);
}

export async function saveAiProviderConfig(
  provider: AiProvider,
  userId: string,
  rawInput: unknown
) {
  const input = providerInputSchema.parse(rawInput);
  const keys = providerSettings[provider];
  const apiKey = stringValue(input.apiKey);
  const model = stringValue(input.model);

  if (apiKey && (apiKey.length < 20 || apiKey.length > 300)) {
    throw new Error("A chave parece incompleta; confira o valor antes de salvar.");
  }
  const validModel = provider === "nvidia" ? /^[a-zA-Z0-9._:-]+\/[a-zA-Z0-9._:-]+$/.test(model) : /^[a-zA-Z0-9._:-]+$/.test(model);
  if (model && (model.length > 120 || !validModel)) {
    throw new Error("O identificador do modelo contém caracteres inválidos.");
  }

  if (provider === "nvidia") {
    await prisma.$transaction(async (tx) => {
      if (input.removeApiKey) {
        await tx.setting.deleteMany({ where: { userId, key: keys.apiKey } });
      } else if (apiKey) {
        await tx.setting.upsert({
          where: { userId_key: { userId, key: keys.apiKey } },
          update: { value: encryptSettingValue(keys.apiKey, apiKey) as never },
          create: { userId, key: keys.apiKey, value: encryptSettingValue(keys.apiKey, apiKey) as never }
        });
      }
      if (model) {
        await tx.setting.upsert({
          where: { userId_key: { userId, key: keys.model } },
          update: { value: model },
          create: { userId, key: keys.model, value: model }
        });
      }
      await persistNvidiaZeroSpendPolicy(tx, userId);
    });
    return getAiProviderConfig(provider, userId);
  }

  if (input.removeApiKey) {
    await prisma.setting.deleteMany({ where: { userId, key: keys.apiKey } });
  } else if (apiKey) {
    await prisma.setting.upsert({
      where: { userId_key: { userId, key: keys.apiKey } },
      update: { value: encryptSettingValue(keys.apiKey, apiKey) as never },
      create: { userId, key: keys.apiKey, value: encryptSettingValue(keys.apiKey, apiKey) as never }
    });
  }

  if (model) {
    await prisma.setting.upsert({
      where: { userId_key: { userId, key: keys.model } },
      update: { value: model },
      create: { userId, key: keys.model, value: model }
    });
  }

  return getAiProviderConfig(provider, userId);
}
