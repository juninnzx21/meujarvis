import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  return value;
}, z.boolean());

const trimmedString = z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string());
const optionalTrimmedString = z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().optional().default(""));

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  APP_VERSION: trimmedString.default("2.0.0"),
  DATABASE_URL: trimmedString.pipe(z.string().min(1)),
  JWT_SECRET: trimmedString.pipe(z.string().min(24, "JWT_SECRET precisa ter ao menos 24 caracteres")),
  JWT_EXPIRES_IN: trimmedString.default("7d"),
  CORS_ORIGIN: trimmedString.default("http://localhost:5173"),
  OPENAI_API_KEY: optionalTrimmedString,
  OPENAI_MODEL: trimmedString.default("gpt-4o-mini"),
  GEMINI_API_KEY: optionalTrimmedString,
  GEMINI_MODEL: trimmedString.default("gemini-2.5-flash"),
  N8N_WEBHOOK_URL: optionalTrimmedString,
  N8N_API_KEY: optionalTrimmedString,
  EVOLUTION_API_URL: optionalTrimmedString,
  EVOLUTION_API_KEY: optionalTrimmedString,
  EVOLUTION_INSTANCE: optionalTrimmedString,
  WHATSAPP_AUTO_REPLY: booleanFromEnv.default(false),
  HOME_ASSISTANT_URL: optionalTrimmedString,
  HOME_ASSISTANT_TOKEN: optionalTrimmedString,
  PIPER_TTS_URL: optionalTrimmedString,
  LOG_LEVEL: trimmedString.default("info"),
  SETTINGS_ENCRYPTION_KEY: optionalTrimmedString.refine(
    (value) => !value || value.length >= 32,
    "SETTINGS_ENCRYPTION_KEY precisa ter ao menos 32 caracteres"
  ),
  SETTINGS_ENCRYPTION_KEY_OLD: optionalTrimmedString.refine(
    (value) => !value || value.length >= 32,
    "SETTINGS_ENCRYPTION_KEY_OLD precisa ter ao menos 32 caracteres"
  ),
  TOTP_ENCRYPTION_KEY: optionalTrimmedString,
  ALLOW_DEMO_LOGIN: booleanFromEnv.default(process.env.NODE_ENV === "production" ? false : true),
  SCHEDULER_ENABLED: booleanFromEnv.default(true),
  SCHEDULER_INTERVAL_SECONDS: z.coerce.number().int().min(10).default(60)
}).superRefine((values, context) => {
  const jwtSecret = values.JWT_SECRET.trim();
  const settingsKeys = [
    ["SETTINGS_ENCRYPTION_KEY", values.SETTINGS_ENCRYPTION_KEY],
    ["SETTINGS_ENCRYPTION_KEY_OLD", values.SETTINGS_ENCRYPTION_KEY_OLD],
    ["TOTP_ENCRYPTION_KEY", values.TOTP_ENCRYPTION_KEY]
  ] as const;
  for (const [name, value] of settingsKeys) {
    if (value && value.trim() === jwtSecret) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [name],
        message: `${name} precisa ser diferente de JWT_SECRET`
      });
    }
  }
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
