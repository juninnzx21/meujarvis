import { prisma } from "../prisma/client.js";
import { isForbiddenAction } from "../middlewares/security.js";
import { getHealth } from "./healthService.js";
import { homeAssistantService } from "./homeAssistantService.js";
import { detectIntent } from "./intentDetectorService.js";
import { findRelevantMemories } from "./memorySearchService.js";
import { n8nService } from "./n8nService.js";
import { openAiService } from "./openAiService.js";
import { writeSystemLog } from "./systemLogService.js";
import { listToolDefinitions } from "./toolRegistryService.js";

const basePrompt =
  "Voce e JARVIS Home AI, um assistente pessoal inteligente, profissional, objetivo e seguro. Ajude em casa inteligente, rotina, tarefas, memorias, automacoes, n8n, WhatsApp e consultas. Responda sempre em portugues brasileiro, nao invente dados, informe claramente quando uma integracao nao estiver configurada e nunca execute acoes sensiveis sem confirmacao explicita.";

function extractAfter(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return text.trim();
}

function isLocalFallbackReply(reply: string) {
  return /modo seguro local|modo local|OpenAI nao respondeu|Gemini nao respondeu/i.test(reply);
}

function buildMemoryFallbackReply(content: string, memories: Awaited<ReturnType<typeof findRelevantMemories>>) {
  if (!memories.length) return "";
  const lower = content.toLowerCase();
  const selected = memories.slice(0, 6);
  const lines = selected.map((memory) => `- ${memory.title}: ${memory.content}`).join("\n");
  if (/projetos?/.test(lower)) {
    return `Com base nas suas memorias, estes sao os principais projetos/contextos que eu tenho registrados:\n${lines}`;
  }
  if (/deploy|producao|produção/.test(lower)) {
    return `Seu padrao de deploy registrado nas memorias e:\n${lines}`;
  }
  if (/prioridades?|roadmap|pendencias|pendências/.test(lower)) {
    return `Suas prioridades registradas para o JARVIS e evolucao tecnica sao:\n${lines}`;
  }
  return `Estou em fallback local, mas encontrei memorias relevantes para responder:\n${lines}`;
}

export const aiOrchestratorService = {
  async process(userId: string, content: string) {
    const intent = detectIntent(content);
    if (intent.name === "security.blocked" || isForbiddenAction(content)) {
      await writeSystemLog({ userId, level: "security", module: "ai", action: "forbidden_action", message: "Comando perigoso bloqueado" });
      return { reply: "Nao posso executar ou ajudar com comandos perigosos, destrutivos, invasivos ou inseguros.", intent: "security.blocked" };
    }

    if (intent.name === "memory.confirmation_required") {
      await writeSystemLog({ userId, level: "security", module: "memory", action: "confirmation_required", message: "Memoria sensivel exige confirmacao" });
      return { reply: "Isso parece conter dado sensivel. Posso salvar somente se voce confirmar explicitamente o que deve ser guardado.", intent: "memory.confirmation_required" };
    }

    if (intent.name === "memory.create") {
      const memoryText = extractAfter(content, [/^(?:lembre|guarde|anote)\s+que\s+(.+)$/i]);
      const memory = await prisma.memory.create({
        data: {
          userId,
          type: "note",
          title: memoryText.slice(0, 64),
          content: memoryText,
          tags: ["auto", "chat"],
          importance: 3
        }
      });
      await writeSystemLog({ userId, module: "memory", action: "auto_create", message: "Memoria criada via chat", metadata: { memoryId: memory.id } });
      return { reply: `Memoria salva com seguranca: "${memory.title}".`, intent: "memory.create", data: memory };
    }

    if (intent.name === "task.create") {
      const title = extractAfter(content, [/^(?:crie uma tarefa para|crie uma tarefa|me lembre de|criar tarefa)\s+(.+)$/i]);
      const task = await prisma.task.create({ data: { userId, title, priority: "medium", status: "pending" } });
      await writeSystemLog({ userId, module: "tasks", action: "auto_create", message: "Tarefa criada via chat", metadata: { taskId: task.id } });
      return { reply: `Tarefa criada: "${task.title}".`, intent: "task.create", data: task };
    }

    if (intent.name === "task.list") {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      const lower = content.toLowerCase();
      const where = lower.includes("hoje")
        ? { userId, dueDate: { gte: todayStart, lte: todayEnd } }
        : /atrasado|pend[eê]ncias/.test(lower)
          ? { userId, status: { not: "done" as const }, dueDate: { lt: now } }
          : { userId, status: { not: "done" as const } };
      const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, take: 8 });
      if (!tasks.length) return { reply: "Voce nao tem tarefas pendentes no momento.", intent: "task.list", data: [] };
      const list = tasks.map((task, index) => `${index + 1}. ${task.title} (${task.priority})`).join("\n");
      return { reply: `Estas sao suas tarefas pendentes:\n${list}`, intent: "task.list", data: tasks };
    }

    if (intent.name === "health.check") {
      const health = await getHealth(true);
      return { reply: `Status do sistema: app ok, banco ${health.database}, OpenAI ${health.openaiConfigured ? "configurada" : "nao configurada"}, n8n ${health.n8nConfigured ? "configurado" : "nao configurado"}, WhatsApp ${health.whatsappConfigured ? "configurado" : "nao configurado"}, Home Assistant ${health.homeAssistantConfigured ? "configurado" : "nao configurado"}.`, intent: "health.check", data: health };
    }

    if (intent.name === "n8n.trigger") {
      const result = await n8nService.trigger({ source: "chat", command: content }, userId);
      return { reply: result.status === "success" ? "Fluxo n8n acionado com sucesso." : "O n8n ainda nao esta configurado. Defina N8N_WEBHOOK_URL no backend.", intent: "n8n.trigger", data: result };
    }

    if (intent.name === "whatsapp.confirmation_required") {
      return { reply: "Envio de WhatsApp exige confirmacao e numero de destino claro. Use a tela WhatsApp ou confirme explicitamente antes do envio.", intent: "whatsapp.confirmation_required" };
    }

    if (intent.name === "home_assistant.confirmation_required") {
      await writeSystemLog({ userId, level: "security", module: "home-assistant", action: "confirmation_required", message: "Comando sensivel de casa inteligente exige confirmacao" });
      return { reply: "Essa acao de casa inteligente parece sensivel. Para fechaduras, portoes ou alarmes, preciso de confirmacao explicita antes de agir.", intent: "home_assistant.confirmation_required" };
    }

    if (intent.name === "home_assistant.conversation") {
      const result = await homeAssistantService.conversation(content);
      return {
        reply: result.status === "success" ? "Comando enviado ao Home Assistant." : "Home Assistant nao esta configurado. Defina HOME_ASSISTANT_URL e HOME_ASSISTANT_TOKEN.",
        intent: "home_assistant.conversation",
        data: result
      };
    }

    const memories = await findRelevantMemories(userId, content, 5);
    const toolSummary = listToolDefinitions().map((tool) => `${tool.name}(${tool.safety})`).join(", ");
    const response = await openAiService.complete([
      { role: "system", content: basePrompt },
      { role: "system", content: `Ferramentas disponiveis para chamadas futuras: ${toolSummary}. Nesta versao, execute somente pelas regras seguras do backend.` },
      { role: "system", content: `Memorias relevantes: ${memories.map((m) => `${m.title}: ${m.content}`).join(" | ") || "nenhuma"}` },
      { role: "user", content }
    ]);
    const safeResponse = isLocalFallbackReply(response) ? buildMemoryFallbackReply(content, memories) || response : response;
    await writeSystemLog({ userId, module: "chat", action: "reply", message: "Resposta do JARVIS gerada" });
    return { reply: safeResponse, intent: "chat.normal" };
  }
};
