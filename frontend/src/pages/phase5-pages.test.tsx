import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandsPage } from "./Commands/CommandsPage";
import { NotificationsPage } from "./Notifications/NotificationsPage";
import { ReportsPage } from "./Reports/ReportsPage";
import { RoutinesPage } from "./Routines/RoutinesPage";

vi.mock("../services/api", () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === "/commands") return Promise.resolve({ data: { commands: [{ id: "system.status", title: "status do sistema", example: "status do sistema", safety: "safe" }] } });
      if (url === "/routines") return Promise.resolve({ data: { routines: [{ id: "r1", name: "Resumo diário", description: "Resumo", enabled: true }] } });
      if (url === "/notifications") return Promise.resolve({ data: { notifications: [{ id: "n1", title: "Aviso", message: "Mensagem", type: "info", createdAt: new Date().toISOString() }] } });
      return Promise.resolve({ data: { recommendations: ["ok"], open: [], logs: [] } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    patch: vi.fn(() => Promise.resolve({ data: { ok: true } }))
  },
  friendlyError: () => "erro"
}));

describe("Phase 5 pages", () => {
  it("renders command center", async () => {
    render(<CommandsPage />);
    expect(await screen.findByText("Comandos")).toBeInTheDocument();
    expect((await screen.findAllByText("status do sistema")).length).toBeGreaterThan(0);
  });

  it("renders routines", async () => {
    render(<RoutinesPage />);
    expect(await screen.findByText("Rotinas")).toBeInTheDocument();
    expect(await screen.findByText("Resumo diário")).toBeInTheDocument();
  });

  it("renders reports", async () => {
    render(<ReportsPage />);
    expect(await screen.findByText("Relatorios")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Resumo do dia")).toBeInTheDocument());
  });

  it("renders notifications", async () => {
    render(<NotificationsPage />);
    expect(await screen.findByText("Notificacoes")).toBeInTheDocument();
    expect(await screen.findByText("Aviso")).toBeInTheDocument();
  });
});
