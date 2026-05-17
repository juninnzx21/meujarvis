import type { BrainIntent, BrainMode } from "./brain.types.js";

export class KnowledgePlannerService {
  toolsFor(intent: BrainIntent, mode: BrainMode) {
    const base: string[] = [];
    if (intent === "system.status") base.push("getSystemStatus", "getIntegrationStatus");
    if (intent === "memory.query") base.push("searchMemories", "listPersonalProfile");
    if (intent === "task.query") base.push("listTodayTasks", "listOverdueTasks");
    if (intent.startsWith("finance.")) base.push("summarizeFinance", "listPendingImports", "detectDuplicates");
    if (intent.startsWith("document.")) base.push("searchDocuments", "listDocuments");
    if (intent === "integration.configure" || intent === "deploy.help") base.push("getIntegrationStatus", "getRecentLogs");
    if (intent === "whatsapp.configure") base.push("getWhatsappStatus", "getWebhookUrl");
    if (intent === "n8n.workflow") base.push("getN8nStatus", "listWorkflows");
    if (intent === "home.action") base.push("getHomeStatus", "listEntities", "prepareSafeAction");
    if (mode === "deep") base.push("searchMemories");
    return Array.from(new Set(base)).slice(0, mode === "quick" ? 3 : 8);
  }
}

export const knowledgePlannerService = new KnowledgePlannerService();
