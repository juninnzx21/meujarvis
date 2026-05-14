import type { NotificationType } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { redactSensitive } from "../utils/redact.js";

export async function createNotification(input: { userId: string; title: string; message: string; type?: NotificationType }) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: String(redactSensitive(input.title)),
      message: String(redactSensitive(input.message)),
      type: input.type ?? "info"
    }
  });
}
