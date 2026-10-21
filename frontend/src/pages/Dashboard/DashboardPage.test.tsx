import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../services/api";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../services/api", () => ({
  api: { get: vi.fn() }
}));

const responses: Record<string, unknown> = {
  "/health/full": { database: "ok", integrations: { openai: { status: "not_checked" } } },
  "/chat/conversations": { conversations: [] },
  "/tasks": { tasks: [
    { id: "task-old", title: "Pagar boleto pendente", status: "pending", dueDate: "2020-01-01T12:00:00.000Z", priority: "high", createdAt: "2020-01-01T11:00:00.000Z" }
  ] },
  "/memories": { memories: [] },
  "/logs": { logs: [] },
  "/notifications": { notifications: [{ id: "notice-1", message: "Aviso real recebido", createdAt: "2020-01-01T00:00:00Z" }] }
};

function renderDashboard() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe("Dashboard Meu Dia com APIs existentes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.get).mockImplementation((url) =>
      Promise.resolve({ data: responses[url] }) as ReturnType<typeof api.get>
    );
  });

  it("mostra tarefas e avisos reais sem criar dados ficticios", async () => {
    renderDashboard();
    expect(await screen.findByText("Pagar boleto pendente")).toBeInTheDocument();
    expect(screen.getByText("Aviso real recebido")).toBeInTheDocument();
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/notifications", { params: { unread: true } });
  });

  it("mantem tarefas e outros modulos quando notificacoes falham", async () => {
    vi.mocked(api.get).mockImplementation((url) =>
      url === "/notifications"
        ? Promise.reject(new Error("offline"))
        : Promise.resolve({ data: responses[url] }) as ReturnType<typeof api.get>
    );
    renderDashboard();
    expect(await screen.findByText("Pagar boleto pendente")).toBeInTheDocument();
    expect(await screen.findByText("Nao foi possivel consultar notificacoes.")).toBeInTheDocument();
  });

  it("nao apresenta dados indisponiveis como zero ou sistema online", async () => {
    vi.mocked(api.get).mockImplementation((url) =>
      url === "/tasks" || url === "/health/full"
        ? Promise.reject(new Error("offline"))
        : Promise.resolve({ data: responses[url] }) as ReturnType<typeof api.get>
    );
    renderDashboard();
    expect(await screen.findByText("Nao foi possivel consultar tarefas.")).toBeInTheDocument();
    expect(screen.getByText("Nao foi possivel verificar a API agora.")).toBeInTheDocument();
    expect(screen.getByText("nao verificado")).toBeInTheDocument();
    expect(screen.queryByText("online")).not.toBeInTheDocument();
  });
});
