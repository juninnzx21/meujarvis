import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { useAuth } from "./contexts/AuthContext";
import { AutomationsPage } from "./pages/Automations/AutomationsPage";
import { ChatPage } from "./pages/Chat/ChatPage";
import { CommandsPage } from "./pages/Commands/CommandsPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { DocumentsPage } from "./pages/Documents/DocumentsPage";
import { IntegrationEventsPage } from "./pages/Integrations/IntegrationEventsPage";
import { IntegrationSettingsPage } from "./pages/Integrations/IntegrationSettingsPage";
import { IntegrationSetupSummaryPage } from "./pages/Integrations/IntegrationSetupSummaryPage";
import { IntegrationWizardPage } from "./pages/Integrations/IntegrationWizardPage";
import { IntegrationsPage } from "./pages/Integrations/IntegrationsPage";
import { JarvisModePage } from "./pages/JarvisMode/JarvisModePage";
import { FinancePage } from "./pages/Finance/FinancePage";
import { FinanceAccountsPage } from "./pages/Finance/FinanceAccountsPage";
import { FinanceCategoriesPage } from "./pages/Finance/FinanceCategoriesPage";
import { FinanceImportPage } from "./pages/Finance/FinanceImportPage";
import { FinanceReportsPage } from "./pages/Finance/FinanceReportsPage";
import { FinanceReviewPage } from "./pages/Finance/FinanceReviewPage";
import { FinanceTransactionsPage } from "./pages/Finance/FinanceTransactionsPage";
import { LoginPage } from "./pages/Login/LoginPage";
import { LogsPage } from "./pages/Logs/LogsPage";
import { MemoryPage } from "./pages/Memory/MemoryPage";
import { MobileAssistantPage } from "./pages/MobileAssistant/MobileAssistantPage";
import { N8nPage } from "./pages/N8n/N8nPage";
import { NotificationsPage } from "./pages/Notifications/NotificationsPage";
import { ReportsPage } from "./pages/Reports/ReportsPage";
import { RoutinesPage } from "./pages/Routines/RoutinesPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { VoiceSettingsPage } from "./pages/Settings/VoiceSettingsPage";
import { SmartHomePage } from "./pages/SmartHome/SmartHomePage";
import { StatusPage } from "./pages/Status/StatusPage";
import { TasksPage } from "./pages/Tasks/TasksPage";
import { VoicePage } from "./pages/Voice/VoicePage";
import { WhatsAppPage } from "./pages/WhatsApp/WhatsAppPage";

function Private({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="grid min-h-screen place-items-center text-cyan-100">Inicializando JARVIS...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Private><AppLayout /></Private>}>
        <Route index element={<DashboardPage />} />
        <Route path="mobile-assistant" element={<MobileAssistantPage />} />
        <Route path="jarvis-mode" element={<JarvisModePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="voice" element={<VoicePage />} />
        <Route path="commands" element={<CommandsPage />} />
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
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/voice" element={<VoiceSettingsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="status" element={<StatusPage />} />
      </Route>
    </Routes>
  );
}
