import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../layouts/AppLayout";
import { CommandsPage } from "./Commands/CommandsPage";
import { FinancePage } from "./Finance/FinancePage";
import { NotificationsPage } from "./Notifications/NotificationsPage";
import { ReportsPage } from "./Reports/ReportsPage";
import { RoutinesPage } from "./Routines/RoutinesPage";
import { FinanceAccountsPage } from "./Finance/FinanceAccountsPage";
import { FinanceCategoriesPage } from "./Finance/FinanceCategoriesPage";
import { FinanceImportPage } from "./Finance/FinanceImportPage";
import { FinanceReportsPage } from "./Finance/FinanceReportsPage";
import { FinanceTransactionsPage } from "./Finance/FinanceTransactionsPage";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Junior Rodrigues" }, logout: vi.fn() })
}));

vi.mock("../services/api", () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === "/commands") return Promise.resolve({ data: { commands: [{ id: "system.status", title: "status do sistema", example: "status do sistema", safety: "safe" }] } });
      if (url === "/routines") return Promise.resolve({ data: { routines: [{ id: "r1", name: "Resumo diario", description: "Resumo", enabled: true, triggerType: "schedule", config: { schedule: { type: "daily" } } }] } });
      if (url === "/finance/reports/summary") return Promise.resolve({ data: { totalBalance: "1000", monthIncome: "500", monthExpenses: "120", estimatedProfit: "380", pendingReview: 1, duplicates: 0, accounts: [{ id: "a1", bankName: "Banco Inter", accountName: "PJ DO INTER", currentBalance: "1000" }], recent: [{ id: "t1", description: "Cliente teste", amount: "120", direction: "in", bankAccount: { accountName: "PJ DO INTER" } }] } });
      if (url === "/finance/bank-accounts") return Promise.resolve({ data: { accounts: [{ id: "a1", bankName: "Banco Inter", accountName: "PJ DO INTER", accountType: "business", currentBalance: "1000", active: true }] } });
      if (url === "/finance/categories") return Promise.resolve({ data: { categories: [{ id: "c1", name: "Servicos prestados", type: "income", keywords: ["cliente"], isDefault: true }, { id: "c2", name: "Hospedagem e servidores", type: "expense", keywords: ["servidor"], isDefault: true }] } });
      if (url === "/finance/ledger/transactions") return Promise.resolve({ data: { transactions: [{ id: "t1", description: "Cliente teste", amount: "120", direction: "in", status: "confirmed", bankAccount: { accountName: "PJ DO INTER" }, category: { name: "Servicos prestados" } }] } });
      if (url === "/finance/reports/categories") return Promise.resolve({ data: { categories: [{ category: "Servicos prestados", type: "income", total: "500" }] } });
      if (url === "/finance/reports/cashflow") return Promise.resolve({ data: { cashflow: [{ date: "2026-05-16", income: "500", expense: "120", net: "380" }] } });
      if (url.startsWith("/notifications")) return Promise.resolve({ data: { unreadCount: 1, notifications: [{ id: "n1", title: "Aviso", message: "Mensagem", type: "warning", createdAt: new Date().toISOString() }] } });
      return Promise.resolve({ data: { recommendations: ["ok"], open: [], overdue: [], logs: [] } });
    }),
    post: vi.fn((url: string) => {
      if (url === "/finance/parse") return Promise.resolve({ data: { parsed: { type: "income", status: "received", description: "cliente teste", amount: 120, transaction_date: "2026-05-14", payment_method: "pix" } } });
      return Promise.resolve({ data: { ok: true } });
    }),
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

  it("renders native finance overview", async () => {
    render(<MemoryRouter><FinancePage /></MemoryRouter>);
    expect(await screen.findByText("Financeiro JARVIS")).toBeInTheDocument();
    expect(screen.getByText("Lançamentos recentes")).toBeInTheDocument();
    expect(screen.getByText("Gerenciar contas")).toBeInTheDocument();
  });

  it("renders finance accounts, transactions, categories, import and reports pages", async () => {
    render(<FinanceAccountsPage />);
    expect(await screen.findByText("Contas bancárias")).toBeInTheDocument();
    cleanup();

    render(<FinanceTransactionsPage />);
    expect(await screen.findByText("Lançamentos")).toBeInTheDocument();
    expect(await screen.findByText("Cliente teste")).toBeInTheDocument();
    cleanup();

    render(<FinanceCategoriesPage />);
    expect(await screen.findByText("Categorias financeiras")).toBeInTheDocument();
    expect(await screen.findByText("Servicos prestados")).toBeInTheDocument();
    cleanup();

    render(<FinanceImportPage />);
    expect(await screen.findByText("Importar extrato")).toBeInTheDocument();
    cleanup();

    render(<FinanceReportsPage />);
    expect(await screen.findByText("Relatórios financeiros")).toBeInTheDocument();
    expect(await screen.findByText("Fluxo de caixa")).toBeInTheDocument();
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
