import type { IntegrationEventTarget, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { redactSensitive } from "../utils/redact.js";
import { createNotification } from "./notificationService.js";
import { n8nService } from "./n8nService.js";
import { writeSystemLog } from "./systemLogService.js";

export const jarvisEventTypes = [
  "task.created",
  "task.updated",
  "task.completed",
  "task.overdue",
  "memory.created",
  "routine.run",
  "routine.failed",
  "backup.completed",
  "system.alert",
  "integration.failed",
  "finance.transaction.created",
  "finance.statement.import.created",
  "whatsapp.command.received",
  "whatsapp.file.received",
  "homeassistant.action.executed",
  "n8n.workflow.triggered"
] as const;

export type JarvisEventType = typeof jarvisEventTypes[number];

type EmitOptions = {
  userId?: string;
  type: JarvisEventType | string;
  payload?: unknown;
  target?: IntegrationEventTarget;
  notify?: boolean;
};

export async function emitJarvisEvent(input: EmitOptions) {
  const payloadRedacted = redactSensitive(input.payload ?? {}) as Prisma.InputJsonValue;
  const event = await prisma.integrationEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      target: input.target ?? "internal",
      payloadRedacted,
      status: "pending"
    }
  });

  await writeSystemLog({
    userId: input.userId,
    module: "event-bus",
    action: "emit",
    message: `Evento ${input.type} emitido`,
    metadata: { eventId: event.id, type: input.type, target: input.target ?? "internal", payload: payloadRedacted }
  });

  if (input.notify && input.userId) {
    await createNotification({
      userId: input.userId,
      title: "Evento JARVIS",
      message: `Evento ${input.type} registrado.`,
      type: input.type.includes("failed") || input.type.includes("overdue") ? "warning" : "info"
    });
  }

  if ((input.target ?? "internal") === "n8n") {
    try {
      const result = await n8nService.trigger({ type: input.type, payload: payloadRedacted, eventId: event.id }, input.userId);
      await prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: result.status === "success" ? "sent" : result.status === "not_configured" ? "ignored" : "failed",
          attempts: { increment: 1 },
          lastError: result.status === "success" ? null : result.message ?? result.status
        }
      });
    } catch (error) {
      await prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message : "Erro desconhecido"
        }
      });
    }
  } else {
    await prisma.integrationEvent.update({ where: { id: event.id }, data: { status: "sent" } });
  }

  return prisma.integrationEvent.findUniqueOrThrow({ where: { id: event.id } });
}
