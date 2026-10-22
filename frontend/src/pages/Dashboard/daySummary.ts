import type { Task } from "../../types";

export type DayTask = Pick<Task, "id" | "title" | "status" | "dueDate">;
export type DayTaskSummary = {
  due: DayTask[];
  overdueCount: number;
};

/**
 * Task deadlines are ISO timestamps from the existing API. Determine day
 * boundaries using the user's browser timezone; never use a server-local
 * calendar day or compare ISO strings lexicographically.
 */
export function calendarDay(timestamp: string | Date, timeZone?: string): string | null {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = (name: string) => parts.find((entry) => entry.type === name)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function summarizeDayTasks(tasks: readonly DayTask[], now: Date, timeZone?: string): DayTaskSummary {
  const today = calendarDay(now, timeZone);
  if (!today) return { due: [], overdueCount: 0 };
  const due = tasks.filter((task) => {
    if (task.status === "done" || task.status === "canceled" || !task.dueDate) return false;
    const day = calendarDay(task.dueDate, timeZone);
    return day !== null && day <= today;
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  const overdueCount = due.filter((task) => (calendarDay(task.dueDate!, timeZone) || today) < today).length;
  return { due, overdueCount };
}
