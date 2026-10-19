import type { Prisma, SystemLogLevel } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { logger } from "../utils/logger.js";
import { redactSensitive } from "../utils/redact.js";

export function sanitizeLogValue(value: unknown, key = ""): unknown {
  if (/secret|token|password|api.?key|authorization|credential/i.test(key)) return "[REDACTED]";
  if (/url|webhook|endpoint/i.test(key)) return "[REDACTED_URL]";
  if (typeof value === "string") {
    return String(redactSensitive(value))
      .replace(/([?&])[^#\s"'<>]*/g, "$1[REDACTED]")
      .replace(/\bhttps?:\/\/[^\s"'<>]+/gi, "[REDACTED_URL]")
      .replace(/(\/webhooks?(?:-test|-wait)?\/)[^?#\s"'<>]+(?:\/[^?#\s"'<>]+)*/gi, "$1[REDACTED]");
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeLogValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
      childKey,
      sanitizeLogValue(childValue, childKey)
    ]));
  }
  return redactSensitive(value);
}

/** Redact historical log content at the API boundary as well as on write. */
export function sanitizeSystemLog<T extends { message: unknown; metadata?: unknown }>(log: T): T {
  return {
    ...log,
    message: sanitizeLogValue(log.message),
    ...(log.metadata === undefined ? {} : { metadata: sanitizeLogValue(log.metadata) })
  } as T;
}

export function sanitizeAutomationLog<T extends { input?: unknown; output?: unknown; error?: unknown }>(log: T): T {
  return {
    ...log,
    ...(log.input === undefined ? {} : { input: sanitizeLogValue(log.input) }),
    ...(log.output === undefined ? {} : { output: sanitizeLogValue(log.output) }),
    ...(log.error === undefined ? {} : { error: sanitizeLogValue(log.error) })
  } as T;
}

export async function writeSystemLog(input: {
  userId?: string;
  level?: SystemLogLevel;
  module: string;
  action: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.systemLog.create({
      data: {
        userId: input.userId,
        level: input.level ?? "info",
        module: input.module,
        action: input.action,
        message: String(redactSensitive(input.message)).slice(0, 1000),
        metadata: input.metadata ? (redactSensitive(input.metadata) as Prisma.InputJsonValue) : undefined
      }
    });
  } catch (error) {
    logger.warn({ errorType: error instanceof Error ? error.name : "UnknownError", module: input.module }, "Failed to persist system log");
  }
}
