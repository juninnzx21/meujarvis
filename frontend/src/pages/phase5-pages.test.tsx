import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../layouts/AppLayout";
import { CommandsPage } from "./Commands/CommandsPage";
import { NotificationsPage } from "./Notifications/NotificationsPage";
import { ReportsPage } from "./Reports/ReportsPage";
import { RoutinesPage } from "./Routines/RoutinesPage";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Junior Rodrigues" }, logout: vi.fn() })
}));

vi.mock("../services/api", () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === "/commands") return Promise.resolve({ data: { commands: [{ id: "system.status", title: "status do sistema", example: "status do sistema", safety: "safe" }] } });
      if (url === "/routines") return Promise.resolve({ data: { routines: [{ id: "r1", name: "Resumo diario", description: "Resumo", enabled: true, triggerType: "schedule", config: { schedule: { type: "daily" } } }] } });
      if (url.startsWith("/notifications")) return Promise.resolve({ data: { unreadCount: 1, notifications: [{ id: "n1", title: "Aviso", message: "Mensagem", type: "warning", createdAt: new Date().toISOString() }] } });
      return Promise.resolve({ data: { recommendations: ["ok"], open: [], overdue: [], logs: [] } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { ok: true } })),
    patch: vi.fn(() => Promise.resolve({ data: { ok: true } }))
  },
  friendlyError: () => "erro"
}));

afterEach(() => cleanup());

describe("Phase 5 and 6 pages", () => {
  it("renders command center", async () => {
    render(<CommandsPage />);
    expect(await screen.findByText("Comandos")).toBeInTheDocument();
    expect((await screen.findAllByText("status do sistema")).length).toBeGreaterThan(0);
  });

  it("renders scheduled routines", async () => {
    render(<RoutinesPage />);
    expect(await screen.findByText("Rotinas")).toBeInTheDocument();
    expect(await screen.findByText("Resumo diario")).toBeInTheDocument();
    expect(await screen.findByText(/Agenda:/)).toBeInTheDocument();
  });

  it("renders reports including overdue task shape", async () => {
    render(<ReportsPage />);
    expect(await screen.findByText("Relatorios")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Resumo do dia")).toBeInTheDocument());
  });

  it("renders notification filters and unread count", async () => {
    render(<NotificationsPage />);
    expect(await screen.findByText("Notificacoes")).toBeInTheDocument();
    expect(await screen.findByText("Aviso")).toBeInTheDocument();
    expect(await screen.findByText("1 nao lida(s)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Warning"));
    expect(await screen.findByText("Aviso")).toBeInTheDocument();
  });

  it("renders notification counter in the app shell", async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    expect((await screen.findAllByText("Notificacoes")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("1")).length).toBeGreaterThanOrEqual(1);
  });
});
