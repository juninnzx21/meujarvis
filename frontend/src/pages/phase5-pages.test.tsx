import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../layouts/AppLayout";
import { CommandsPage } from "./Commands/CommandsPage";
import { FinancePage } from "./Finance/FinancePage";
import { DocumentsPage } from "./Documents/DocumentsPage";
import { NotificationsPage } from "./Notifications/NotificationsPage";
import { ReportsPage } from "./Reports/ReportsPage";
import { RoutinesPage } from "./Routines/RoutinesPage";
import { FinanceAccountsPage } from "./Finance/FinanceAccountsPage";
import { FinanceCategoriesPage } from "./Finance/FinanceCategoriesPage";
import { FinanceImportPage } from "./Finance/FinanceImportPage";
import { FinanceReportsPage } from "./Finance/FinanceReportsPage";
import { FinanceTransactionsPage } from "./Finance/FinanceTransactionsPage";
import { MobileAssistantPage } from "./MobileAssistant/MobileAssistantPage";
import { IntegrationsPage } from "./Integrations/IntegrationsPage";
import { IntegrationSettingsPage } from "./Integrations/IntegrationSettingsPage";
import { IntegrationSetupSummaryPage } from "./Integrations/IntegrationSetupSummaryPage";
import { IntegrationWizardPage } from "./Integrations/IntegrationWizardPage";
import { JarvisModePage } from "./JarvisMode/JarvisModePage";
import { WhatsAppPage } from "./WhatsApp/WhatsAppPage";
import { VoicePage } from "./Voice/VoicePage";
import { VoiceSettingsPage } from "./Settings/VoiceSettingsPage";
import { stopSpeaking, testVoice } from "../services/textToSpeechService";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Junior Rodrigues" }, logout: vi.fn() })
}));

vi.mock("../services/textToSpeechService", () => ({
  jarvisVoicePreset: { preset: "jarvis-br-premium", voiceURI: "", lang: "pt-BR", rate: 0.92, pitch: 0.82, volume: 1, spokenRepliesEnabled: true },
  getAvailableVoices: vi.fn(() => [{ voiceURI: "voice-1", name: "Brasil Neutral", lang: "pt-BR" }]),
  selectBestJarvisVoice: vi.fn(() => ({ voiceURI: "voice-1", name: "Brasil Neutral", lang: "pt-BR" })),
  loadVoiceSettings: vi.fn(() => ({ preset: "jarvis-br-premium", voiceURI: "voice-1", lang: "pt-BR", rate: 0.92, pitch: 0.82, volume: 1, spokenRepliesEnabled: true })),
  saveVoiceSettings: vi.fn((settings) => settings),
  speakJarvis: vi.fn(() => true),
  stopSpeaking: vi.fn(),
  testVoice: vi.fn(() => true)
}));

vi.mock("../services/speechRecognitionService", () => ({
  isSpeechRecognitionSupported: vi.fn(() => true),
  startListening: vi.fn(() => true),
  stopListening: vi.fn(),
  onTranscript: vi.fn(),
  onError: vi.fn()
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
      if (url === "/documents") return Promise.resolve({ data: { documents: [{ id: "d1", title: "Documento teste", fileType: "md" }] } });
      if (url.startsWith("/documents/search")) return Promise.resolve({ data: { chunks: [{ id: "ch1", content: "Trecho redigido do JARVIS" }] } });
      if (url === "/health/full") return Promise.resolve({ data: { app: "ok", database: "ok", scheduler: { enabled: true } } });
      if (url === "/whatsapp/status" || url === "/whatsapp/config") return Promise.resolve({ data: { status: "configured", source: "settings", apiUrl: "https://evolution.test", apiUrlConfigured: true, apiKeyConfigured: true, apiKeyMasked: "sec...key", instanceConfigured: true, instance: "jarvis", autoReply: false } });
      if (url === "/whatsapp/evolution/status") return Promise.resolve({ data: { status: "configured", configured: true, instance: "jarvis", connectionState: "disconnected", apiUrlConfigured: true, apiKeyConfigured: true, instanceConfigured: true } });
      if (url.startsWith("/whatsapp/evolution/connection-state")) return Promise.resolve({ data: { status: "success", instance: "jarvis", connectionState: "connected", message: "WhatsApp conectado." } });
      if (url === "/integrations/setup" || url.startsWith("/integrations/setup-wizard")) return Promise.resolve({ data: { steps: [{ provider: "api_public", title: "API publica", description: "URLs oficiais", status: "configured", configured: true, publicUrls: { api: "https://apijarvis.juninnzxtec.com.br/api" }, manualSteps: [] }, { provider: "n8n", title: "n8n", description: "Workflows", status: "manual_action_required", configured: false, publicUrls: { n8n: "https://n8njarvis.juninnzxtec.com.br" }, manualSteps: ["Importar workflows manualmente."] }] } });
      if (url === "/integrations/setup/summary") return Promise.resolve({ data: { status: "degraded", providers: [{ provider: "api_public", title: "API publica", status: "configured", configured: true, manualSteps: [] }, { provider: "n8n", title: "n8n", status: "manual_action_required", configured: false, manualSteps: ["Importar workflows manualmente."] }] } });
      if (url.startsWith("/integrations")) return Promise.resolve({ data: { urls: { frontendPublicUrl: "https://jarvis.juninnzxtec.com.br", apiPublicUrl: "https://apijarvis.juninnzxtec.com.br/api", whatsappWebhookUrl: "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook", n8nPublicUrl: "https://n8njarvis.juninnzxtec.com.br" }, providers: { api_public: { configured: true, status: "configured", url: "https://apijarvis.juninnzxtec.com.br/api" }, openai: { configured: true, status: "configured" }, gemini: { configured: true, status: "configured" }, n8n: { configured: false, status: "not_configured", apiKeyConfigured: false, webhookSecretConfigured: false }, whatsapp: { configured: false, status: "not_configured", webhookUrl: "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook", apiKeyConfigured: false, autoReply: false }, evolution: { configured: false, status: "not_configured" }, home_assistant: { configured: false, status: "not_configured", tokenConfigured: false }, finance: { configured: false, status: "not_configured", tokenConfigured: false, defaultAccountName: "PJ DO INTER" }, monitoring: { configured: true, status: "configured" }, backup: { configured: true, status: "configured" } } } });
      return Promise.resolve({ data: { recommendations: ["ok"], open: [], overdue: [], logs: [] } });
    }),
    post: vi.fn((url: string) => {
      if (url === "/finance/parse") return Promise.resolve({ data: { parsed: { type: "income", status: "received", description: "cliente teste", amount: 120, transaction_date: "2026-05-14", payment_method: "pix" } } });
      if (url === "/chat/send") return Promise.resolve({ data: { assistantMessage: { id: "m2", role: "assistant", content: "Status operacional.", createdAt: new Date().toISOString() } } });
      if (url === "/voice/process") return Promise.resolve({ data: { reply: "Certo. Verifiquei o sistema e esta tudo operacional.", voicePersona: "JARVIS BR Premium" } });
      if (url.startsWith("/integrations/test")) return Promise.resolve({ data: { status: "not_configured", message: "not_configured" } });
      if (url.startsWith("/integrations/setup")) return Promise.resolve({ data: { status: "manual_action_required", message: "manual_action_required" } });
      if (url === "/whatsapp/evolution/connect") return Promise.resolve({ data: { status: "success", connectionState: "connecting", qrCodeDataUrl: "data:image/png;base64,AAAA", canRenderQr: true, message: "QR Code gerado." } });
      if (url === "/whatsapp/evolution/configure-webhook") return Promise.resolve({ data: { status: "manual_action_required", manualActionRequired: true, checklist: ["Abrir manager da Evolution."], message: "manual_action_required" } });
      return Promise.resolve({ data: { ok: true } });
    }),
    put: vi.fn(() => Promise.resolve({ data: { ok: true } })),
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

  it("renders documents module", async () => {
    render(<DocumentsPage />);
    expect(await screen.findByText("Documentos")).toBeInTheDocument();
    expect(await screen.findByText(/Documento teste/)).toBeInTheDocument();
  });

  it("renders integrations control center and setup pages", async () => {
    render(<MemoryRouter><IntegrationsPage /></MemoryRouter>);
    expect(await screen.findByText("Central de Integracoes")).toBeInTheDocument();
    expect(await screen.findByText("WhatsApp/Evolution")).toBeInTheDocument();
    cleanup();

    render(<MemoryRouter><IntegrationSettingsPage /></MemoryRouter>);
    expect(await screen.findByText("Configuracoes de Integracoes")).toBeInTheDocument();
    expect(await screen.findByText("Evolution API / WhatsApp")).toBeInTheDocument();
    cleanup();

    render(<MemoryRouter><IntegrationWizardPage /></MemoryRouter>);
    expect(await screen.findByText("Assistente Universal de Configuracao")).toBeInTheDocument();
    expect((await screen.findAllByText("API publica")).length).toBeGreaterThan(0);
    cleanup();

    render(<MemoryRouter><IntegrationSetupSummaryPage /></MemoryRouter>);
    expect(await screen.findByText("Resumo de Configuracao")).toBeInTheDocument();
    expect(await screen.findByText("Exportar Markdown")).toBeInTheDocument();
  });

  it("renders WhatsApp QR wizard without exposing secrets", async () => {
    render(<WhatsAppPage />);
    expect(await screen.findByText("1. Configurar Evolution")).toBeInTheDocument();
    expect(await screen.findByText("2. Instancia e QR Code")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook")).toBeInTheDocument();
    expect(screen.queryByText("secret-evolution-key")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Gerar QR Code"));
    expect(await screen.findByAltText("QR Code para conectar WhatsApp")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Configurar webhook automaticamente"));
    expect(await screen.findByText("Acao manual necessaria")).toBeInTheDocument();
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

  it("renders mobile assistant and sends quick command", async () => {
    render(<MemoryRouter><MobileAssistantPage /></MemoryRouter>);
    expect(await screen.findByText("JARVIS Mobile")).toBeInTheDocument();
    expect(screen.getByText(/O microfone so e ativado/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Status do sistema"));
    expect(await screen.findByText("Status operacional.")).toBeInTheDocument();
  });

  it("renders premium voice pages and keeps microphone explicit", async () => {
    render(<MemoryRouter><VoicePage /></MemoryRouter>);
    expect(await screen.findByText("Modo Voz")).toBeInTheDocument();
    expect(screen.getByText(/microfone so liga quando voce clica/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Testar voz"));
    expect(testVoice).toHaveBeenCalled();
    cleanup();

    render(<MemoryRouter><JarvisModePage /></MemoryRouter>);
    expect((await screen.findAllByText("JARVIS BR Premium")).length).toBeGreaterThan(0);
    expect(screen.getByText("Central de comando pronta.")).toBeInTheDocument();
    cleanup();

    render(<VoiceSettingsPage />);
    expect(await screen.findByText("JARVIS BR Premium")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Parar fala"));
    expect(stopSpeaking).toHaveBeenCalled();
  });

});
