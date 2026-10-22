import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { useAuth } from "./contexts/AuthContext";

const AutomationsPage = lazy(() => import("./pages/Automations/AutomationsPage").then((page) => ({ default: page.AutomationsPage })));
const BrainAgentsPage = lazy(() => import("./pages/Brain/BrainPages").then((page) => ({ default: page.BrainAgentsPage })));
const BrainFeedbackPage = lazy(() => import("./pages/Brain/BrainPages").then((page) => ({ default: page.BrainFeedbackPage })));
const BrainMemoryPage = lazy(() => import("./pages/Brain/BrainPages").then((page) => ({ default: page.BrainMemoryPage })));
const BrainPage = lazy(() => import("./pages/Brain/BrainPages").then((page) => ({ default: page.BrainPage })));
const BrainToolsPage = lazy(() => import("./pages/Brain/BrainPages").then((page) => ({ default: page.BrainToolsPage })));
const ChatPage = lazy(() => import("./pages/Chat/ChatPage").then((page) => ({ default: page.ChatPage })));
const CommandsPage = lazy(() => import("./pages/Commands/CommandsPage").then((page) => ({ default: page.CommandsPage })));
const ComputerPage = lazy(() => import("./pages/Computer/ComputerPage").then((page) => ({ default: page.ComputerPage })));
const DashboardPage = lazy(() => import("./pages/Dashboard/DashboardPage").then((page) => ({ default: page.DashboardPage })));
const DocumentsPage = lazy(() => import("./pages/Documents/DocumentsPage").then((page) => ({ default: page.DocumentsPage })));
const DownloadsCenterPage = lazy(() => import("./pages/Downloads/DownloadsCenterPage").then((page) => ({ default: page.DownloadsCenterPage })));
const IntegrationEventsPage = lazy(() => import("./pages/Integrations/IntegrationEventsPage").then((page) => ({ default: page.IntegrationEventsPage })));
const IntegrationSettingsPage = lazy(() => import("./pages/Integrations/IntegrationSettingsPage").then((page) => ({ default: page.IntegrationSettingsPage })));
const IntegrationSetupSummaryPage = lazy(() => import("./pages/Integrations/IntegrationSetupSummaryPage").then((page) => ({ default: page.IntegrationSetupSummaryPage })));
const IntegrationWizardPage = lazy(() => import("./pages/Integrations/IntegrationWizardPage").then((page) => ({ default: page.IntegrationWizardPage })));
const HomeAssistantSetupPage = lazy(() => import("./pages/Integrations/HomeAssistantSetupPage").then((page) => ({ default: page.HomeAssistantSetupPage })));
const IntegrationsPage = lazy(() => import("./pages/Integrations/IntegrationsPage").then((page) => ({ default: page.IntegrationsPage })));
const JarvisModePage = lazy(() => import("./pages/JarvisMode/JarvisModePage").then((page) => ({ default: page.JarvisModePage })));
const FinancePage = lazy(() => import("./pages/Finance/FinancePage").then((page) => ({ default: page.FinancePage })));
const FinanceAccountsPage = lazy(() => import("./pages/Finance/FinanceAccountsPage").then((page) => ({ default: page.FinanceAccountsPage })));
const FinanceCategoriesPage = lazy(() => import("./pages/Finance/FinanceCategoriesPage").then((page) => ({ default: page.FinanceCategoriesPage })));
const FinanceImportPage = lazy(() => import("./pages/Finance/FinanceImportPage").then((page) => ({ default: page.FinanceImportPage })));
const FinanceReportsPage = lazy(() => import("./pages/Finance/FinanceReportsPage").then((page) => ({ default: page.FinanceReportsPage })));
const FinanceReviewPage = lazy(() => import("./pages/Finance/FinanceReviewPage").then((page) => ({ default: page.FinanceReviewPage })));
const FinanceTransactionsPage = lazy(() => import("./pages/Finance/FinanceTransactionsPage").then((page) => ({ default: page.FinanceTransactionsPage })));
const InstallPage = lazy(() => import("./pages/Install/InstallPage").then((page) => ({ default: page.InstallPage })));
const LoginPage = lazy(() => import("./pages/Login/LoginPage").then((page) => ({ default: page.LoginPage })));
const LogsPage = lazy(() => import("./pages/Logs/LogsPage").then((page) => ({ default: page.LogsPage })));
const MemoryPage = lazy(() => import("./pages/Memory/MemoryPage").then((page) => ({ default: page.MemoryPage })));
const MobileAssistantPage = lazy(() => import("./pages/MobileAssistant/MobileAssistantPage").then((page) => ({ default: page.MobileAssistantPage })));
const N8nPage = lazy(() => import("./pages/N8n/N8nPage").then((page) => ({ default: page.N8nPage })));
const NotificationsPage = lazy(() => import("./pages/Notifications/NotificationsPage").then((page) => ({ default: page.NotificationsPage })));
const ReportsPage = lazy(() => import("./pages/Reports/ReportsPage").then((page) => ({ default: page.ReportsPage })));
const RoutinesPage = lazy(() => import("./pages/Routines/RoutinesPage").then((page) => ({ default: page.RoutinesPage })));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage").then((page) => ({ default: page.SettingsPage })));
const VoiceSettingsPage = lazy(() => import("./pages/Settings/VoiceSettingsPage").then((page) => ({ default: page.VoiceSettingsPage })));
const SmartHomePage = lazy(() => import("./pages/SmartHome/SmartHomePage").then((page) => ({ default: page.SmartHomePage })));
const StatusPage = lazy(() => import("./pages/Status/StatusPage").then((page) => ({ default: page.StatusPage })));
const TasksPage = lazy(() => import("./pages/Tasks/TasksPage").then((page) => ({ default: page.TasksPage })));
const VoicePage = lazy(() => import("./pages/Voice/VoicePage").then((page) => ({ default: page.VoicePage })));
const WhatsAppPage = lazy(() => import("./pages/WhatsApp/WhatsAppPage").then((page) => ({ default: page.WhatsAppPage })));

function Private({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="grid min-h-screen place-items-center text-cyan-100">Inicializando JARVIS...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<div role="status" className="grid min-h-[40vh] place-items-center text-cyan-100">Carregando tela...</div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/install" element={<InstallPage />} />
      <Route element={<Private><AppLayout /></Private>}>
        <Route index element={<DashboardPage />} />
        <Route path="mobile-assistant" element={<MobileAssistantPage />} />
        <Route path="jarvis-mode" element={<JarvisModePage />} />
        <Route path="brain" element={<BrainPage />} />
        <Route path="brain/agents" element={<BrainAgentsPage />} />
        <Route path="brain/tools" element={<BrainToolsPage />} />
        <Route path="brain/memory" element={<BrainMemoryPage />} />
        <Route path="brain/feedback" element={<BrainFeedbackPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="voice" element={<VoicePage />} />
        <Route path="commands" element={<CommandsPage />} />
        <Route path="computer" element={<ComputerPage />} />
        <Route path="downloads" element={<DownloadsCenterPage />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="integrations/setup-wizard" element={<IntegrationWizardPage />} />
        <Route path="integrations/setup-summary" element={<IntegrationSetupSummaryPage />} />
        <Route path="integrations/events" element={<IntegrationEventsPage />} />
        <Route path="settings/integrations" element={<IntegrationSettingsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="finance/accounts" element={<FinanceAccountsPage />} />
        <Route path="finance/transactions" element={<FinanceTransactionsPage />} />
        <Route path="finance/categories" element={<FinanceCategoriesPage />} />
        <Route path="finance/import" element={<FinanceImportPage />} />
        <Route path="finance/import/:id/review" element={<FinanceReviewPage />} />
        <Route path="finance/review" element={<FinanceReviewPage />} />
        <Route path="finance/reports" element={<FinanceReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="automations" element={<AutomationsPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="n8n" element={<N8nPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="smart-home" element={<SmartHomePage />} />
        <Route path="smart-home/setup" element={<HomeAssistantSetupPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/voice" element={<VoiceSettingsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="status" element={<StatusPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
