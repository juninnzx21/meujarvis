import { prisma } from "../prisma/client.js";
import { getHealth } from "./healthService.js";

export async function buildDailySummary(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [openTasks, doneTasks, memories, automationLogs, errors, health] = await Promise.all([
    prisma.task.findMany({ where: { userId, status: { not: "done" } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.task.findMany({ where: { userId, status: "done", updatedAt: { gte: since } }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.memory.findMany({ where: { userId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.automationLog.findMany({ where: { automation: { userId }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.systemLog.findMany({ where: { userId, level: { in: ["error", "warning", "security"] }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10 }),
    getHealth(true)
  ]);

  return {
    openTasks,
    doneTasks,
    recentMemories: memories,
    automationLogs,
    recentErrors: errors,
    integrations: "integrations" in health ? health.integrations : {},
    recommendations: [
      openTasks.length ? "Priorize as tarefas urgentes e vencidas antes de criar novas automacoes." : "Nenhuma tarefa aberta critica encontrada.",
      errors.length ? "Revise falhas recentes em Logs antes de acionar rotinas externas." : "Sistema sem falhas recentes relevantes nas ultimas 24h."
    ]
  };
}

export async function buildTaskReport(userId: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const [open, overdue, today, done] = await Promise.all([
    prisma.task.findMany({ where: { userId, status: { not: "done" } }, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({ where: { userId, status: { not: "done" }, dueDate: { lt: now } }, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({ where: { userId, dueDate: { gte: start, lte: end } }, orderBy: { dueDate: "asc" } }),
    prisma.task.count({ where: { userId, status: "done" } })
  ]);
  return { open, overdue, today, doneCount: done, recommendations: overdue.length ? ["Resolva as tarefas vencidas primeiro."] : ["Sem atrasos no momento."] };
}

export async function buildSystemReport(userId: string) {
  const [health, logs] = await Promise.all([
    getHealth(true),
    prisma.systemLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  return { health, logs, recommendations: health.database === "ok" ? ["Banco operacional."] : ["Banco requer atencao imediata."] };
}

export async function buildActivityReport(userId: string) {
  const [logs, messages, routines] = await Promise.all([
    prisma.systemLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.message.findMany({ where: { conversation: { userId } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.routineRun.findMany({ where: { routine: { userId } }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  return { logs, messages, routineRuns: routines, recommendations: ["Use a Central de Comandos para transformar atividades repetidas em rotinas."] };
}
