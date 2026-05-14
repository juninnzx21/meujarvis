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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  APP_VERSION: z.string().default("1.0.0"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(24, "JWT_SECRET precisa ter ao menos 24 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  N8N_WEBHOOK_URL: z.string().optional().default(""),
  N8N_API_KEY: z.string().optional().default(""),
  EVOLUTION_API_URL: z.string().optional().default(""),
  EVOLUTION_API_KEY: z.string().optional().default(""),
  EVOLUTION_INSTANCE: z.string().optional().default(""),
  WHATSAPP_AUTO_REPLY: booleanFromEnv.default(false),
  HOME_ASSISTANT_URL: z.string().optional().default(""),
  HOME_ASSISTANT_TOKEN: z.string().optional().default(""),
  LOG_LEVEL: z.string().default("info")
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
