import { describe, expect, it } from "vitest";
import { calendarDay, summarizeDayTasks } from "./daySummary";

describe("Meu Dia - tarefas existentes", () => {
  const now = new Date("2026-10-21T14:00:00Z");
  it("classifica prazos pelo fuso, nao por data UTC do servidor", () => {
    expect(calendarDay("2026-10-22T01:30:00Z", "America/Sao_Paulo")).toBe("2026-10-21");
    expect(calendarDay("2026-10-22T01:30:00Z", "UTC")).toBe("2026-10-22");
  });
  it("separa atrasadas, de hoje, concluidas, futuras e sem data", () => {
    const { due, overdueCount } = summarizeDayTasks([
      { id: "1", title: "Ontem", status: "pending", dueDate: "2026-10-20T12:00:00Z" },
      { id: "2", title: "Hoje", status: "in_progress", dueDate: "2026-10-22T01:30:00Z" },
      { id: "3", title: "Concluida", status: "done", dueDate: "2026-10-20T12:00:00Z" },
      { id: "4", title: "Futura", status: "pending", dueDate: "2026-10-22T15:00:00Z" },
      { id: "5", title: "Sem prazo", status: "pending" },
      { id: "6", title: "Cancelada", status: "canceled", dueDate: "2026-10-20T12:00:00Z" },
      { id: "7", title: "Invalida", status: "pending", dueDate: "nao-iso" }
    ], now, "America/Sao_Paulo");
    expect(due.map((t) => t.id)).toEqual(["1", "2"]);
    expect(overdueCount).toBe(1);
  });
  it("nao altera a lista original", () => {
    const tasks = Object.freeze([
      Object.freeze({ id: "b", title: "Hoje", status: "pending", dueDate: "2026-10-21T18:00:00Z" }),
      Object.freeze({ id: "a", title: "Ontem", status: "pending", dueDate: "2026-10-20T18:00:00Z" })
    ]);
    expect(summarizeDayTasks(tasks, now, "America/Sao_Paulo").due.map(t=>t.id)).toEqual(["a","b"]);
    expect(tasks[0].id).toBe("b");
  });
  it("recusa data invalida", () => expect(calendarDay("invalida", "UTC")).toBeNull());
});
