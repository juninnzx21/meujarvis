import { prisma } from "../../prisma/client.js";
import { findRelevantMemories } from "../../services/memorySearchService.js";
import { redactSensitive } from "../../utils/redact.js";
import type { BrainContext, BrainMode, BrainSourceItem } from "./brain.types.js";
import { toolRegistryService } from "./toolRegistry.service.js";

function excerpt(value: unknown, max = 420) {
  return String(redactSensitive(value ?? "")).replace(/\s+/g, " ").trim().slice(0, max);
}

function source(type: BrainSourceItem["type"], title: string, value: unknown, id?: string, score?: number): BrainSourceItem {
  return { type, title, excerpt: excerpt(value), id, score };
}

export class ContextBuilderService {
  async build(userId: string, message: string, mode: BrainMode): Promise<BrainContext> {
    const memoryLimit = mode === "deep" ? 10 : mode === "quick" ? 3 : 6;
    const docLimit = mode === "deep" ? 8 : mode === "quick" ? 2 : 4;
    const [matchedMemories, documents, recentTasks, pendingImports, recentFeedback] = await Promise.all([
      findRelevantMemories(userId, message, memoryLimit),
      prisma.documentChunk.findMany({
        where: {
          document: { userId },
          OR: [
            { contentRedacted: { contains: message.slice(0, 80), mode: "insensitive" } },
            { document: { title: { contains: message.slice(0, 80), mode: "insensitive" } } }
          ]
        },
        include: { document: true },
        take: docLimit
      }),
      prisma.task.findMany({ where: { userId, status: { not: "done" } }, orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.statementImport.findMany({ where: { userId, status: { in: ["uploaded", "parsed", "review_required"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.systemLog.findMany({ where: { userId, module: "brain", action: { in: ["feedback", "preference_saved"] } }, orderBy: { createdAt: "desc" }, take: 5 })
    ]);
    const memories = matchedMemories.length
      ? matchedMemories
      : await prisma.memory.findMany({ where: { userId }, orderBy: [{ importance: "desc" }, { updatedAt: "desc" }], take: memoryLimit });

    const memorySources = memories.map((memory, index) => source("memory", memory.title, memory.content, memory.id, 1 - index * 0.05));
    const documentSources = documents.map((chunk, index) => source("document", `${chunk.document.title} #${chunk.chunkIndex + 1}`, chunk.contentRedacted, chunk.documentId, 1 - index * 0.05));
    const taskSources = recentTasks.map((task) => source("task", task.title, `${task.status} ${task.priority} ${task.dueDate?.toISOString() ?? ""}`, task.id));
    const financeSources = pendingImports.map((item) => source("finance", item.fileName, `status ${item.status}, linhas ${item.totalRows}, revisao ${item.reviewRows}`, item.id));
    const feedbackSources = recentFeedback.map((item) => source("feedback", item.message, item.metadata, item.id));

    const systemSources: BrainSourceItem[] = [];
    if (mode !== "quick") {
      const health = await toolRegistryService.run(userId, "getSystemStatus", { message });
      systemSources.push(source("system", "Status do sistema", health.data ?? health.message));
    }

    const integrations: BrainSourceItem[] = [];
    if (/integr|n8n|whatsapp|evolution|home assistant|openai|gemini/i.test(message)) {
      const integration = await toolRegistryService.run(userId, "getIntegrationStatus", { message });
      integrations.push(source("integration", "Status das integracoes", integration.data ?? integration.message));
    }

    const sources = [...memorySources, ...documentSources, ...systemSources, ...taskSources, ...financeSources, ...integrations, ...feedbackSources].slice(0, mode === "deep" ? 24 : 14);
    return { memories: memorySources, documents: documentSources, system: systemSources, tasks: taskSources, finance: financeSources, integrations, feedback: feedbackSources, sources };
  }
}

export const contextBuilderService = new ContextBuilderService();
