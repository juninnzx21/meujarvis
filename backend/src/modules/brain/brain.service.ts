import { openAiService } from "../../services/openAiService.js";
import { prisma } from "../../prisma/client.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { redactSensitive } from "../../utils/redact.js";
import { getBrainAgent, listBrainAgents } from "./agentRegistry.service.js";
import { answerVerifierService } from "./answerVerifier.service.js";
import type { BrainAskInput, BrainAskResponse, BrainMode, BrainToolResult } from "./brain.types.js";
import { contextBuilderService } from "./contextBuilder.service.js";
import { feedbackLearningService } from "./feedbackLearning.service.js";
import { intentRouterService } from "./intentRouter.service.js";
import { knowledgePlannerService } from "./knowledgePlanner.service.js";
import { safetyPolicyService } from "./safetyPolicy.service.js";
import { sourceAttributionService } from "./sourceAttribution.service.js";
import { toolRegistryService } from "./toolRegistry.service.js";

function normalizeMode(mode?: string): BrainMode {
  return mode === "quick" || mode === "deep" ? mode : "normal";
}

function compactContext(context: Awaited<ReturnType<typeof contextBuilderService.build>>) {
  return context.sources
    .slice(0, 10)
    .map((item) => `[${item.type}] ${item.title}: ${item.excerpt}`)
    .join("\n");
}

function localFallback(input: {
  message: string;
  classification: ReturnType<typeof intentRouterService.classify>;
  tools: BrainToolResult[];
  context: Awaited<ReturnType<typeof contextBuilderService.build>>;
}) {
  const { intent } = input.classification;
  const contextPool = intent === "memory.query" ? input.context.memories : input.context.sources;
  const sourceLines = contextPool.slice(0, 5).map((item) => `- ${item.title}: ${item.excerpt}`).join("\n");
  if (intent === "system.status") {
    const status = input.tools.find((tool) => tool.tool === "getSystemStatus")?.data;
    return `Status do sistema: ${JSON.stringify(redactSensitive(status))}`;
  }
  if (intent === "memory.query") {
    return sourceLines ? `Com base nas suas memorias, encontrei:\n${sourceLines}` : "Ainda nao encontrei memorias suficientes sobre isso.";
  }
  if (intent.startsWith("finance.")) {
    return `No financeiro, encontrei este resumo seguro:\n${input.tools.map((tool) => `- ${tool.tool}: ${tool.message || JSON.stringify(redactSensitive(tool.data)).slice(0, 500)}`).join("\n") || "Sem dados financeiros suficientes."}\n\nImportacoes OFX/CSV continuam exigindo revisao antes de qualquer gravacao final.`;
  }
  if (intent.startsWith("document.")) {
    return sourceLines ? `Encontrei estes trechos/documentos relevantes:\n${sourceLines}` : "Nao encontrei documentos relevantes para essa pergunta.";
  }
  if (intent === "whatsapp.configure") {
    return "O WhatsApp deve continuar usando o webhook oficial e a frase obrigatoria \"ei jarvis\". Pelo painel, configure Evolution API, gere QR e use manual_action_required quando a API nao permitir automacao.";
  }
  if (intent === "n8n.workflow") {
    return "O n8n usa workflows locais versionados sem credenciais. Se a API/token nao estiver configurado, o JARVIS deve orientar importacao manual.";
  }
  return sourceLines
    ? `Resposta em modo local com contexto interno:\n${sourceLines}`
    : "Posso ajudar, mas nao encontrei contexto interno especifico. Se quiser, reformule com mais detalhes ou use o modo Deep.";
}

export class BrainService {
  async ask(input: BrainAskInput): Promise<BrainAskResponse> {
    const mode = normalizeMode(input.mode);
    const message = input.message.trim();
    const safety = safetyPolicyService.evaluate(message);
    const classification = intentRouterService.classify(message);
    const agent = getBrainAgent(classification.agent);

    if (!message) {
      return {
        answer: "Informe uma mensagem para o Brain processar.",
        reply: "Informe uma mensagem para o Brain processar.",
        agent: agent.name,
        intent: classification.intent,
        confidence: 0,
        usedTools: [],
        usedSources: [],
        needsConfirmation: false,
        draftAction: null,
        suggestedNextActions: ["Enviar uma pergunta ou comando."],
        mode
      };
    }

    if (safety.blocked) {
      const response: BrainAskResponse = {
        answer: "Nao posso exibir, salvar ou repetir segredos. Posso trabalhar apenas com status seguro: configurado, ausente, valido ou invalido.",
        reply: "Nao posso exibir, salvar ou repetir segredos. Posso trabalhar apenas com status seguro: configurado, ausente, valido ou invalido.",
        agent: "SecurityGuardianAgent",
        intent: classification.intent,
        confidence: classification.confidence,
        usedTools: [],
        usedSources: [],
        needsConfirmation: false,
        draftAction: null,
        suggestedNextActions: ["Use a Central de Integracoes para salvar credenciais criptografadas."],
        mode
      };
      await writeSystemLog({ userId: input.userId, level: "security", module: "brain", action: "blocked", message: "Brain bloqueou solicitacao com risco de segredo" });
      return response;
    }

    if (classification.intent === "memory.create") {
      const memoryText = message.replace(/^(?:lembre|guarde|anote)\s+que\s+/i, "").trim();
      const memory = await prisma.memory.create({
        data: { userId: input.userId, type: "note", title: memoryText.slice(0, 64), content: memoryText, tags: ["auto", "chat", "brain"], importance: 3 }
      });
      const answer = `Memoria salva com seguranca: "${memory.title}".`;
      await writeSystemLog({ userId: input.userId, module: "brain", action: "memory_create", message: "Memoria criada pelo Brain", metadata: { memoryId: memory.id } });
      return {
        answer,
        reply: answer,
        agent: agent.name,
        intent: classification.intent,
        confidence: classification.confidence,
        usedTools: [{ tool: "createMemory", status: "success", data: { memoryId: memory.id } }],
        usedSources: [],
        needsConfirmation: false,
        draftAction: null,
        suggestedNextActions: ["Buscar memoria", "Atualizar preferencia se necessario"],
        mode
      };
    }

    if (classification.intent === "task.create") {
      const title = message.replace(/^(?:crie uma tarefa para|crie uma tarefa|me lembre de|criar tarefa)\s+/i, "").trim();
      const task = await prisma.task.create({ data: { userId: input.userId, title, priority: "medium", status: "pending" } });
      const answer = `Tarefa criada: "${task.title}".`;
      await writeSystemLog({ userId: input.userId, module: "brain", action: "task_create", message: "Tarefa criada pelo Brain", metadata: { taskId: task.id } });
      return {
        answer,
        reply: answer,
        agent: agent.name,
        intent: classification.intent,
        confidence: classification.confidence,
        usedTools: [{ tool: "createTask", status: "success", data: { taskId: task.id } }],
        usedSources: [],
        needsConfirmation: false,
        draftAction: null,
        suggestedNextActions: ["Listar tarefas", "Definir prazo"],
        mode
      };
    }

    const context = await contextBuilderService.build(input.userId, message, mode);
    const plannedTools = input.allowTools === false ? [] : knowledgePlannerService.toolsFor(classification.intent, mode);
    const usedTools: BrainToolResult[] = [];
    for (const tool of plannedTools) {
      usedTools.push(await toolRegistryService.run(input.userId, tool, { query: message, message }));
    }

    const promptContext = compactContext(context);
    let answer = "";
    if (input.allowExternalAI === false) {
      answer = localFallback({ message, classification, tools: usedTools, context });
    } else {
      const response = await openAiService.complete([
        {
          role: "system",
          content: [
            "Voce e o JARVIS Super Intelligence Core.",
            "Responda em portugues brasileiro claro, objetivo e profissional.",
            "Use o agente especialista informado, memoria, documentos e ferramentas internas.",
            "Nao invente fatos. Se faltar contexto, diga o que falta.",
            "Nao exponha segredos. Acoes sensiveis exigem confirmacao.",
            "WhatsApp so executa com a frase ei jarvis. OFX/CSV exige previa/revisao."
          ].join(" ")
        },
        { role: "system", content: `Agente: ${agent.name}. Descricao: ${agent.description}. Regras: ${agent.safetyRules.join(" | ")}` },
        { role: "system", content: `Intencao: ${classification.intent}. Dominio: ${classification.domain}. Modo: ${mode}.` },
        { role: "system", content: `Contexto interno redigido:\n${promptContext || "sem contexto interno relevante"}` },
        { role: "system", content: `Ferramentas consultadas:\n${JSON.stringify(redactSensitive(usedTools)).slice(0, 6000)}` },
        { role: "user", content: message }
      ]);
      answer = /modo seguro local|OpenAI nao respondeu|Gemini nao respondeu/i.test(response)
        ? localFallback({ message, classification, tools: usedTools, context })
        : response;
    }

    const verification = answerVerifierService.verify({
      question: message,
      answer,
      sources: context.sources,
      needsConfirmation: safety.needsConfirmation || usedTools.some((tool) => tool.status === "confirmation_required"),
      caution: safety.needsCaution
    });

    const usedSources = sourceAttributionService.format(context.sources);
    const response: BrainAskResponse = {
      answer: verification.answer,
      reply: verification.answer,
      agent: agent.name,
      intent: classification.intent,
      confidence: classification.confidence,
      usedTools,
      usedSources,
      needsConfirmation: verification.needsConfirmation,
      draftAction: verification.needsConfirmation ? { status: "confirmation_required", intent: classification.intent } : null,
      suggestedNextActions: verification.suggestedNextActions.length ? verification.suggestedNextActions : ["Continuar conversa", "Salvar feedback se esta resposta precisar ajuste"],
      mode
    };

    await writeSystemLog({
      userId: input.userId,
      module: "brain",
      action: "ask",
      message: "Brain respondeu pergunta com contexto seguro",
      metadata: { intent: response.intent, agent: response.agent, mode, tools: usedTools.map((tool) => ({ tool: tool.tool, status: tool.status })), sourceCount: usedSources.length }
    });
    return response;
  }

  async plan(input: BrainAskInput) {
    const classification = intentRouterService.classify(input.message);
    const mode = normalizeMode(input.mode);
    return {
      intent: classification.intent,
      confidence: classification.confidence,
      agent: classification.agent,
      mode,
      plannedTools: knowledgePlannerService.toolsFor(classification.intent, mode),
      safety: safetyPolicyService.evaluate(input.message).issues
    };
  }

  async executeDraft(userId: string, draft: unknown) {
    await writeSystemLog({ userId, module: "brain", action: "execute_draft_requested", message: "Execucao de draft exige confirmacao manual", metadata: { draft: redactSensitive(draft) as never } });
    return { status: "confirmation_required", message: "Draft recebido. A execucao real exige confirmacao explicita na tela correspondente.", draft: redactSensitive(draft) };
  }

  status() {
    return {
      status: "ready",
      agents: listBrainAgents().length,
      tools: toolRegistryService.listTools().length,
      modes: ["quick", "normal", "deep"],
      safety: "enabled",
      externalAI: openAiService.configured ? "configured" : "fallback_local"
    };
  }

  agents() {
    return { agents: listBrainAgents() };
  }

  tools() {
    return { tools: toolRegistryService.listTools() };
  }

  feedback = feedbackLearningService;
}

export const brainService = new BrainService();
