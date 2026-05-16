import type { Routine } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { logger } from "../utils/logger.js";
import { redactSensitive } from "../utils/redact.js";
import { createNotification } from "./notificationService.js";
import { runRoutineSafely } from "./routineRunnerService.js";
import { writeSystemLog } from "./systemLogService.js";

type ScheduleConfig = {
  type?: "daily" | "weekly" | "interval_minutes";
  time?: string;
  dayOfWeek?: number;
  minutes?: number;
};

class SchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastRunAt: Date | null = null;
  private lastError: string | null = null;
  private recentErrors: Array<{ at: Date; stage: string; message: string }> = [];

  get enabled() {
    return env.SCHEDULER_ENABLED;
  }

  status() {
    return {
      enabled: this.enabled,
      running: this.timer !== null,
      intervalSeconds: env.SCHEDULER_INTERVAL_SECONDS,
      lastRunAt: this.lastRunAt?.toISOString() ?? null,
      lastError: this.lastError,
      errorCountRecent: this.errorCountRecent()
    };
  }

  start() {
    if (!this.enabled || this.timer) return;
    this.timer = setInterval(() => {
      void this.runOnce();
    }, env.SCHEDULER_INTERVAL_SECONDS * 1000);
    void this.runOnce();
    logger.info({ intervalSeconds: env.SCHEDULER_INTERVAL_SECONDS }, "Scheduler online");
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(now = new Date()) {
    if (!this.enabled) {
      return { skipped: true, reason: "disabled" };
    }
    if (this.running) {
      return { skipped: true, reason: "already_running" };
    }

    this.running = true;
    this.lastRunAt = now;
    try {
      const errorsBefore = this.errorCountRecent();
      const routines = await this.runStage("routines", () => this.runScheduledRoutines(now));
      const reminders = await this.runStage("reminders", () => this.processTaskReminders(now));
      const overdue = await this.runStage("overdue", () => this.processOverdueTasks(now));
      await writeSystemLog({
        module: "scheduler",
        action: "tick",
        message: "Scheduler executado",
        metadata: { routines, reminders, overdue }
      });
      if (this.errorCountRecent() === errorsBefore) this.lastError = null;
      return { skipped: false, routines, reminders, overdue };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      this.lastError = String(redactSensitive(message));
      await writeSystemLog({
        level: "error",
        module: "scheduler",
        action: "tick_error",
        message: "Erro no scheduler",
        metadata: { error: message }
      });
      return { skipped: false, error: this.lastError };
    } finally {
      this.running = false;
    }
  }

  private errorCountRecent() {
    const cutoff = Date.now() - 60 * 60 * 1000;
    this.recentErrors = this.recentErrors.filter((item) => item.at.getTime() >= cutoff);
    return this.recentErrors.length;
  }

  private async runStage(stage: string, callback: () => Promise<number>) {
    try {
      return await callback();
    } catch (error) {
      const message = String(redactSensitive(error instanceof Error ? error.message : "Erro desconhecido"));
      this.lastError = `${stage}: ${message}`;
      this.recentErrors.push({ at: new Date(), stage, message });
      await writeSystemLog({
        level: "error",
        module: "scheduler",
        action: `${stage}_error`,
        message: "Erro em etapa do scheduler",
        metadata: { stage, error: message }
      });
      return 0;
    }
  }

  private async runScheduledRoutines(now: Date) {
    const routines = await prisma.routine.findMany({
      where: { enabled: true, triggerType: "schedule" }
    });
    let executed = 0;

    for (const routine of routines) {
      if (!this.isRoutineDue(routine, now)) continue;
      const result = await runRoutineSafely(routine, { source: "scheduler", scheduledAt: now.toISOString() });
      executed += 1;
      if ("error" in result) {
        await createNotification({
          userId: routine.userId,
          title: "Falha em rotina agendada",
          message: `A rotina ${routine.name} falhou: ${result.error}`,
          type: "error"
        });
      } else {
        await createNotification({
          userId: routine.userId,
          title: "Rotina agendada executada",
          message: `A rotina ${routine.name} foi executada com sucesso.`,
          type: "success"
        });
      }
    }

    return executed;
  }

  private isRoutineDue(routine: Routine, now: Date) {
    const config = routine.config as Record<string, unknown>;
    const schedule = this.parseSchedule(config.schedule);
    if (!schedule.type) return false;
    if (!this.isAfterConfiguredTime(schedule, now)) return false;

    if (schedule.type === "interval_minutes") {
      const minutes = Math.max(1, Number(schedule.minutes ?? 60));
      if (!routine.lastRunAt) return true;
      return now.getTime() - routine.lastRunAt.getTime() >= minutes * 60 * 1000;
    }

    if (schedule.type === "daily") {
      return !routine.lastRunAt || !this.isSameLocalDay(routine.lastRunAt, now);
    }

    if (schedule.type === "weekly") {
      const day = Number.isInteger(schedule.dayOfWeek) ? Number(schedule.dayOfWeek) : 1;
      if (now.getDay() !== day) return false;
      return !routine.lastRunAt || !this.isSameLocalWeek(routine.lastRunAt, now);
    }

    return false;
  }

  private parseSchedule(value: unknown): ScheduleConfig {
    if (typeof value === "string") return { type: value as ScheduleConfig["type"] };
    if (value && typeof value === "object") return value as ScheduleConfig;
    return {};
  }

  private isAfterConfiguredTime(schedule: ScheduleConfig, now: Date) {
    if (!schedule.time) return true;
    const [hour, minute] = schedule.time.split(":").map((part) => Number(part));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return true;
    return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
  }

  private isSameLocalDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private isSameLocalWeek(a: Date, b: Date) {
    const start = (date: Date) => {
      const value = new Date(date);
      value.setHours(0, 0, 0, 0);
      value.setDate(value.getDate() - value.getDay());
      return value.getTime();
    };
    return start(a) === start(b);
  }

  private async processTaskReminders(now: Date) {
    const tasks = await prisma.task.findMany({
      where: {
        reminderAt: { lte: now },
        reminderSentAt: null,
        status: { notIn: ["done", "canceled"] }
      },
      take: 50
    });

    for (const task of tasks) {
      await createNotification({
        userId: task.userId,
        title: "Lembrete de tarefa",
        message: `Lembrete: ${task.title}`,
        type: task.priority === "urgent" ? "warning" : "info"
      });
      await prisma.task.update({ where: { id: task.id }, data: { reminderSentAt: now } });
      await writeSystemLog({
        userId: task.userId,
        module: "scheduler",
        action: "task_reminder",
        message: "Lembrete de tarefa enviado",
        metadata: { taskId: task.id }
      });
    }

    return tasks.length;
  }

  private async processOverdueTasks(now: Date) {
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        overdueNotifiedAt: null,
        status: { notIn: ["done", "canceled"] }
      },
      take: 50
    });

    const byUser = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const list = byUser.get(task.userId) ?? [];
      list.push(task);
      byUser.set(task.userId, list);
    }

    for (const [userId, userTasks] of byUser) {
      await createNotification({
        userId,
        title: "Tarefas vencidas",
        message: `Voce tem ${userTasks.length} tarefa(s) vencida(s): ${userTasks.slice(0, 3).map((task) => task.title).join(", ")}.`,
        type: "warning"
      });
      await writeSystemLog({
        userId,
        level: "warning",
        module: "scheduler",
        action: "task_overdue",
        message: "Resumo de tarefas vencidas criado",
        metadata: { taskIds: userTasks.map((task) => task.id) }
      });
    }

    if (tasks.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: tasks.map((task) => task.id) } },
        data: { overdueNotifiedAt: now }
      });
    }

    return tasks.length;
  }
}

export const schedulerService = new SchedulerService();
