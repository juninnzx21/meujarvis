import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
      "req.body.apiKey",
      "res.headers.authorization",
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "apiKey",
      "OPENAI_API_KEY",
      "EVOLUTION_API_KEY",
      "HOME_ASSISTANT_TOKEN",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.apiKey",
      "*.authorization"
    ],
    censor: "[REDACTED]"
  }
});
