import { isForbiddenAction } from "../middlewares/security.js";

export type IntentName =
  | "security.blocked"
  | "memory.create"
  | "memory.confirmation_required"
  | "task.create"
  | "task.list"
  | "health.check"
  | "n8n.trigger"
  | "whatsapp.confirmation_required"
  | "home_assistant.confirmation_required"
  | "home_assistant.conversation"
  | "chat.normal";

export type DetectedIntent = {
  name: IntentName;
  confidence: number;
  requiresConfirmation?: boolean;
  reason?: string;
};

const sensitiveMemoryPattern = /(senha|token|chave api|api key|cart[aã]o|cpf|segredo|private key|pix|documento)/i;
const sensitiveHomePattern = /(fechadura|porta|port[aã]o|alarme|trava|destravar|abrir|desarmar)/i;

export function containsSensitiveMemory(text: string) {
  return sensitiveMemoryPattern.test(text);
}

export function detectIntent(content: string): DetectedIntent {
  const normalized = content.trim().toLowerCase();

  if (isForbiddenAction(content)) return { name: "security.blocked", confidence: 1, reason: "forbidden_action" };
  if (/^(lembre|guarde|anote)\s+que\b/i.test(content)) {
    if (containsSensitiveMemory(content)) {
      return { name: "memory.confirmation_required", confidence: 0.95, requiresConfirmation: true, reason: "sensitive_memory" };
    }
    return { name: "memory.create", confidence: 0.95 };
  }
  if (/^(crie uma tarefa|me lembre de|criar tarefa)\b/i.test(content)) return { name: "task.create", confidence: 0.9 };
  if (/liste minhas tarefas|listar tarefas|minhas tarefas|tarefas.*hoje|atrasado|pend[eê]ncias/i.test(normalized)) return { name: "task.list", confidence: 0.9 };
  if (/status do sistema|health|saude do sistema|saúde do sistema/i.test(normalized)) return { name: "health.check", confidence: 0.95 };
  if (/rode o fluxo|acion(e|ar).*n8n|webhook/i.test(normalized)) return { name: "n8n.trigger", confidence: 0.85 };
  if (/mande mensagem para|enviar whatsapp|whatsapp para/i.test(normalized)) {
    return { name: "whatsapp.confirmation_required", confidence: 0.9, requiresConfirmation: true, reason: "external_message" };
  }
  if (/ligar luz|desligar luz|acenda|apague|temperatura|ativar cena|sensores|fechadura|port[aã]o|alarme/i.test(normalized)) {
    if (sensitiveHomePattern.test(normalized)) {
      return { name: "home_assistant.confirmation_required", confidence: 0.92, requiresConfirmation: true, reason: "sensitive_home_action" };
    }
    return { name: "home_assistant.conversation", confidence: 0.8 };
  }

  return { name: "chat.normal", confidence: 0.5 };
}
