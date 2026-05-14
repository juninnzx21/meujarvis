import type { Prisma, Routine } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { redactSensitive } from "../utils/redact.js";
import { buildActivityReport, buildDailySummary, buildSystemReport, buildTaskReport } from "./reportService.js";
import { writeSystemLog } from "./systemLogService.js";

export async function runRoutineReport(userId: string, report: string) {
  if (report === "tasks") return buildTaskReport(userId);
  if (report === "system" || report === "integrations") return buildSystemReport(userId);
  if (report === "activity") return buildActivityReport(userId);
  return buildDailySummary(userId);
}

export async function runRoutineSafely(routine: Routine, input: Record<string, unknown> = {}) {
  const run = await prisma.routineRun.create({
    data: { routineId: routine.id, status: "pending", input: input as Prisma.InputJsonValue }
  });

  try {
    const config = routine.config as Record<string, unknown>;
    const action = String(config.action ?? "report");
    if (["whatsapp.send", "home_assistant.sensitive", "shell", "mass_message"].includes(action)) {
      throw new Error("Acao sensivel bloqueada pelo scheduler");
    }

    const output = await runRoutineReport(routine.userId, String(config.report ?? "daily-summary"));
    const updated = await prisma.routineRun.update({
      where: { id: run.id },
      data: { status: "success", output: output as never }
    });
    await prisma.routine.update({ where: { id: routine.id }, data: { lastRunAt: new Date() } });
    await writeSystemLog({
      userId: routine.userId,
      module: "routines",
      action: "run",
      message: "Rotina executada",
      metadata: { routineId: routine.id, runId: updated.id, source: input.source ?? "manual" }
    });
    return { run: updated, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const updated = await prisma.routineRun.update({
      where: { id: run.id },
      data: { status: "error", error: String(redactSensitive(message)) }
    });
    await writeSystemLog({
      userId: routine.userId,
      level: "error",
      module: "routines",
      action: "run_error",
      message: "Erro ao executar rotina",
      metadata: { routineId: routine.id, runId: updated.id, error: message }
    });
    return { run: updated, error: message };
  }
}
