import { prisma } from "../../prisma/client.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { redactSensitive } from "../../utils/redact.js";
import { safetyPolicyService } from "./safetyPolicy.service.js";

export class FeedbackLearningService {
  async create(userId: string, input: { message: string; savePreference?: boolean }) {
    const safety = safetyPolicyService.evaluate(input.message);
    const safeMessage = String(redactSensitive(input.message)).slice(0, 1000);
    await writeSystemLog({
      userId,
      module: "brain",
      action: "feedback",
      message: "Feedback de resposta registrado",
      metadata: { feedback: safeMessage, savePreference: Boolean(input.savePreference), issues: safety.issues }
    });

    let memory = null;
    if (input.savePreference && !safety.issues.includes("sensitive_data")) {
      memory = await prisma.memory.create({
        data: {
          userId,
          type: "preference",
          title: `Preferencia aprendida ${new Date().toISOString().slice(0, 10)}`,
          content: safeMessage,
          tags: ["brain", "feedback", "preferencia"],
          importance: 4
        }
      });
      await writeSystemLog({ userId, module: "brain", action: "preference_saved", message: "Preferencia aprendida salva como memoria", metadata: { memoryId: memory.id } });
    }

    return { status: "success", savedPreference: Boolean(memory), memoryId: memory?.id ?? null };
  }

  async list(userId: string) {
    const feedback = await prisma.systemLog.findMany({
      where: { userId, module: "brain", action: { in: ["feedback", "preference_saved"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, message: true, metadata: true, createdAt: true }
    });
    return { feedback: redactSensitive(feedback) };
  }
}

export const feedbackLearningService = new FeedbackLearningService();
