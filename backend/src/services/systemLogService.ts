import type { Prisma, SystemLogLevel } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { logger } from "../utils/logger.js";
import { redactSensitive } from "../utils/redact.js";

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
        message: input.message,
        metadata: input.metadata ? (redactSensitive(input.metadata) as Prisma.InputJsonValue) : undefined
      }
    });
  } catch (error) {
    logger.warn({ error, module: input.module }, "Failed to persist system log");
  }
}
