import { homeAssistantService } from "./homeAssistantService.js";
import { n8nService } from "./n8nService.js";
import { whatsappService } from "./whatsappService.js";
import { aiOrchestratorService } from "./aiOrchestratorService.js";
import { buildDailySummary, buildTaskReport } from "./reportService.js";
import { writeSystemLog } from "./systemLogService.js";

export const commands = [
  { id: "system.status", title: "status do sistema", example: "status do sistema", safety: "safe" },
  { id: "task.create", title: "criar tarefa", example: "crie uma tarefa para revisar pendencias", safety: "safe" },
  { id: "memory.create", title: "criar memória", example: "lembre que prefiro relatórios objetivos", safety: "safe" },
  { id: "task.list", title: "listar tarefas", example: "liste minhas tarefas", safety: "safe" },
  { id: "memory.list", title: "listar memórias", example: "liste minhas memórias", safety: "safe" },
  { id: "n8n.test", title: "testar n8n", example: "testar n8n", safety: "safe" },
  { id: "whatsapp.test", title: "testar WhatsApp", example: "testar WhatsApp", safety: "safe" },
  { id: "home.test", title: "testar Home Assistant", example: "testar Home Assistant", safety: "safe" },
  { id: "light.on", title: "ligar luz", example: "ligar luz light.sala", safety: "safe" },
  { id: "light.off", title: "desligar luz", example: "desligar luz light.sala", safety: "safe" },
  { id: "report.daily", title: "gerar resumo do dia", example: "gerar resumo do dia", safety: "safe" },
  { id: "report.tasks", title: "gerar relatório de pendências", example: "resuma minhas pendências", safety: "safe" },
  { id: "whatsapp.prepare", title: "preparar mensagem para número", example: "preparar mensagem para 5511999999999", safety: "confirmation_required" }
];

function extractLightEntity(text: string) {
  return text.match(/light\.[a-zA-Z0-9_]+/)?.[0] || "light.sala";
}

export async function runCommand(userId: string, phrase: string) {
  const normalized = phrase.toLowerCase();
  let result: unknown;
  let intent = "chat";
  if (/testar n8n/.test(normalized)) {
    intent = "n8n.test";
    result = await n8nService.test(userId);
  } else if (/testar whatsapp/.test(normalized)) {
    intent = "whatsapp.test";
    result = await whatsappService.testConnection(userId);
  } else if (/testar home assistant/.test(normalized)) {
    intent = "home.test";
    result = await homeAssistantService.testConnection(userId);
  } else if (/ligar luz/.test(normalized)) {
    intent = "light.on";
    result = await homeAssistantService.setLight(extractLightEntity(phrase), "turn_on", userId);
  } else if (/desligar luz/.test(normalized)) {
    intent = "light.off";
    result = await homeAssistantService.setLight(extractLightEntity(phrase), "turn_off", userId);
  } else if (/resumo do dia/.test(normalized)) {
    intent = "report.daily";
    result = await buildDailySummary(userId);
  } else if (/pend[eê]ncias|atrasado/.test(normalized)) {
    intent = "report.tasks";
    result = await buildTaskReport(userId);
  } else if (/preparar mensagem para/.test(normalized)) {
    intent = "whatsapp.prepare";
    result = { status: "confirmation_required", message: "Mensagem preparada. Confirme na tela WhatsApp antes de enviar." };
  } else {
    result = await aiOrchestratorService.process(userId, phrase);
  }
  await writeSystemLog({ userId, module: "commands", action: intent, message: "Comando executado pela central", metadata: { phrase, intent } });
  return { intent, result };
}
