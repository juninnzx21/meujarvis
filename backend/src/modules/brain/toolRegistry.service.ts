import { prisma } from "../../prisma/client.js";
import { getHealth } from "../../services/healthService.js";
import { publicIntegrationUrls } from "../../services/integrationConfigService.js";
import { n8nService } from "../../services/n8nService.js";
import { whatsappService } from "../../services/whatsappService.js";
import { homeAssistantService } from "../../services/homeAssistantService.js";
import { findRelevantMemories } from "../../services/memorySearchService.js";
import { redactSensitive } from "../../utils/redact.js";
import type { BrainToolDefinition, BrainToolResult } from "./brain.types.js";

export const brainTools: BrainToolDefinition[] = [
  { name: "getSystemStatus", description: "Consulta status basico do app, banco e scheduler.", safety: "safe", category: "Sistema" },
  { name: "getHealthFull", description: "Consulta health completo redigido.", safety: "safe", category: "Sistema" },
  { name: "getRecentLogs", description: "Lista logs recentes redigidos.", safety: "safe", category: "Sistema" },
  { name: "getNotifications", description: "Lista notificacoes recentes.", safety: "safe", category: "Sistema" },
  { name: "getIntegrationStatus", description: "Resume integracoes configuradas/ausentes.", safety: "safe", category: "Sistema" },
  { name: "searchMemories", description: "Busca memorias relevantes.", safety: "safe", category: "Memorias" },
  { name: "createMemory", description: "Cria memoria nao sensivel apos confirmacao quando necessario.", safety: "confirmation_required", category: "Memorias" },
  { name: "listPersonalProfile", description: "Lista memorias importantes do perfil pessoal.", safety: "safe", category: "Memorias" },
  { name: "createTask", description: "Cria tarefa simples.", safety: "safe", category: "Tarefas" },
  { name: "listTodayTasks", description: "Lista tarefas de hoje.", safety: "safe", category: "Tarefas" },
  { name: "listOverdueTasks", description: "Lista tarefas vencidas.", safety: "safe", category: "Tarefas" },
  { name: "summarizeFinance", description: "Resume saldos, entradas, saidas e pendencias.", safety: "safe", category: "Financeiro" },
  { name: "createTransactionDraft", description: "Prepara lancamento financeiro, sem salvar confirmado.", safety: "confirmation_required", category: "Financeiro" },
  { name: "listPendingImports", description: "Lista importacoes pendentes de revisao.", safety: "safe", category: "Financeiro" },
  { name: "detectDuplicates", description: "Resume duplicatas de importacao.", safety: "safe", category: "Financeiro" },
  { name: "searchDocuments", description: "Busca documentos e trechos redigidos.", safety: "safe", category: "Documentos" },
  { name: "listDocuments", description: "Lista documentos do usuario.", safety: "safe", category: "Documentos" },
  { name: "getN8nStatus", description: "Consulta status do n8n.", safety: "safe", category: "n8n" },
  { name: "listWorkflows", description: "Lista workflows locais conhecidos.", safety: "safe", category: "n8n" },
  { name: "triggerSafeWorkflow", description: "Prepara disparo seguro de workflow.", safety: "confirmation_required", category: "n8n" },
  { name: "getWhatsappStatus", description: "Consulta status WhatsApp/Evolution.", safety: "safe", category: "WhatsApp" },
  { name: "getEvolutionStatus", description: "Consulta status seguro Evolution.", safety: "safe", category: "WhatsApp" },
  { name: "getWebhookUrl", description: "Retorna webhook oficial do WhatsApp.", safety: "safe", category: "WhatsApp" },
  { name: "getHomeStatus", description: "Consulta status Home Assistant.", safety: "safe", category: "Home Assistant" },
  { name: "listEntities", description: "Lista entidades se configurado.", safety: "safe", category: "Home Assistant" },
  { name: "prepareSafeAction", description: "Prepara acao de casa inteligente com confirmacao quando sensivel.", safety: "confirmation_required", category: "Home Assistant" }
];

function ok(tool: string, data: unknown, message?: string): BrainToolResult {
  return { tool, status: "success", data: redactSensitive(data), message };
}

export class ToolRegistryService {
  listTools() {
    return brainTools;
  }

  async run(userId: string, tool: string, input: { query?: string; message?: string } = {}): Promise<BrainToolResult> {
    try {
      if (tool === "getSystemStatus") return ok(tool, await getHealth(false));
      if (tool === "getHealthFull") return ok(tool, await getHealth(true));
      if (tool === "getRecentLogs") return ok(tool, await prisma.systemLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8, select: { level: true, module: true, action: true, message: true, createdAt: true } }));
      if (tool === "getNotifications") return ok(tool, await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }));
      if (tool === "getIntegrationStatus") {
        const health = await getHealth(true);
        return ok(tool, "integrations" in health ? health.integrations : health);
      }
      if (tool === "searchMemories") return ok(tool, await findRelevantMemories(userId, input.query || input.message || "", 8));
      if (tool === "listPersonalProfile") return ok(tool, await prisma.memory.findMany({ where: { userId, importance: { gte: 4 } }, orderBy: [{ importance: "desc" }, { updatedAt: "desc" }], take: 12 }));
      if (tool === "createTask") return { tool, status: "confirmation_required", message: "Posso preparar a tarefa, mas confirme titulo e prazo antes de salvar." };
      if (tool === "listTodayTasks") {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        return ok(tool, await prisma.task.findMany({ where: { userId, dueDate: { gte: start, lte: end } }, orderBy: { createdAt: "desc" }, take: 10 }));
      }
      if (tool === "listOverdueTasks") return ok(tool, await prisma.task.findMany({ where: { userId, status: { not: "done" }, dueDate: { lt: new Date() } }, orderBy: { dueDate: "asc" }, take: 10 }));
      if (tool === "summarizeFinance") {
        const [accounts, pendingImports, pendingRows] = await Promise.all([
          prisma.bankAccount.findMany({ where: { userId, active: true }, select: { bankName: true, accountName: true, currentBalance: true, currency: true } }),
          prisma.statementImport.count({ where: { userId, status: { in: ["uploaded", "parsed", "review_required"] } } }),
          prisma.statementImportRow.count({ where: { import: { userId }, status: "pending" } })
        ]);
        return ok(tool, { accounts, pendingImports, pendingRows, requireImportReview: true });
      }
      if (tool === "listPendingImports") return ok(tool, await prisma.statementImport.findMany({ where: { userId, status: { in: ["uploaded", "parsed", "review_required"] } }, orderBy: { createdAt: "desc" }, take: 10 }));
      if (tool === "detectDuplicates") return ok(tool, await prisma.statementImportRow.count({ where: { import: { userId }, status: "duplicate" } }));
      if (tool === "searchDocuments") return ok(tool, await prisma.documentChunk.findMany({ where: { document: { userId }, contentRedacted: { contains: input.query || input.message || "", mode: "insensitive" } }, include: { document: true }, take: 8 }));
      if (tool === "listDocuments") return ok(tool, await prisma.document.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 }));
      if (tool === "getN8nStatus") return ok(tool, n8nService.status());
      if (tool === "listWorkflows") return ok(tool, ["jarvis-system-alert", "jarvis-daily-summary", "jarvis-task-created", "jarvis-health-monitor", "jarvis-evolution-test"]);
      if (tool === "getWhatsappStatus") return ok(tool, await whatsappService.status(userId));
      if (tool === "getEvolutionStatus") return ok(tool, await whatsappService.status(userId));
      if (tool === "getWebhookUrl") return ok(tool, { webhookUrl: publicIntegrationUrls.whatsappWebhookUrl });
      if (tool === "getHomeStatus") return ok(tool, await homeAssistantService.status());
      if (tool === "listEntities") return ok(tool, await homeAssistantService.entities());
      if (tool === "createMemory" || tool === "createTransactionDraft" || tool === "triggerSafeWorkflow" || tool === "prepareSafeAction") {
        return { tool, status: "confirmation_required", message: "Ferramenta preparada, mas exige confirmacao explicita antes de qualquer efeito real." };
      }
      return { tool, status: "ignored", message: "Ferramenta nao disponivel nesta fase." };
    } catch {
      return { tool, status: "error", message: "Falha segura ao consultar ferramenta." };
    }
  }
}

export const toolRegistryService = new ToolRegistryService();
