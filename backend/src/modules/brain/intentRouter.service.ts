import { agentForIntent } from "./agentRegistry.service.js";
import type { BrainIntent, IntentClassification } from "./brain.types.js";

const normalized = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function match(text: string, pattern: RegExp, intent: BrainIntent, confidence: number, domain: string, reason: string): IntentClassification | null {
  if (!pattern.test(text)) return null;
  return { intent, confidence, domain, agent: agentForIntent(intent), reason };
}

export class IntentRouterService {
  classify(message: string): IntentClassification {
    const text = normalized(message);
    const matches: Array<IntentClassification | null> = [
      match(text, /lembre que|guarde que|salve como memoria|atualize minha preferencia/, "memory.create", 0.88, "memoria", "memory write keyword"),
      match(text, /o que voce sabe sobre mim|meus projetos|minha stack|minhas prioridades|minhas preferencias/, "memory.query", 0.9, "memoria", "personal profile keyword"),
      match(text, /crie uma tarefa|criar tarefa|me lembre de|tarefas? de hoje|tarefas? pendentes/, /crie|criar|me lembre/.test(text) ? "task.create" : "task.query", 0.82, "tarefas", "task keyword"),
      match(text, /status|saude|sistema|health|online/, "system.status", 0.92, "sistema", "status keyword"),
      match(text, /quanto entrou|quanto saiu|saldo|financeiro|lucro|categoria|duplicata|extrato|ofx|csv|pj do inter/, /extrato|ofx|csv|importar/.test(text) ? "finance.statement.import" : "finance.query", 0.9, "financeiro", "finance keyword"),
      match(text, /documento|arquivo|rag|pdf|resuma|quais documentos/, "document.query", 0.82, "documentos", "document keyword"),
      match(text, /codex|prompt|codigo|programa|debug|typescript|laravel|react|vue|node|php/, /prompt|codex/.test(text) ? "codex.prompt" : "code.help", 0.84, "programacao", "developer keyword"),
      match(text, /deploy|vps|docker|caddy|dns|directadmin|producao|backup|monitoramento/, "deploy.help", 0.84, "devops", "devops keyword"),
      match(text, /integracao|configurar|wizard|openai|gemini|home assistant/, "integration.configure", 0.75, "integracoes", "integration keyword"),
      match(text, /whatsapp|evolution|qr|webhook/, "whatsapp.configure", 0.88, "whatsapp", "whatsapp keyword"),
      match(text, /n8n|workflow|automacao|evento/, "n8n.workflow", 0.86, "n8n", "n8n keyword"),
      match(text, /luz|sensor|casa|fechadura|portao|alarme|climate|switch/, "home.action", 0.82, "casa inteligente", "home assistant keyword"),
      match(text, /proposta|cliente|vendas|saas|landing|precificacao|contrato/, "business.proposal", 0.82, "negocios", "business keyword"),
      match(text, /me ensine|plano de estudo|aprender|explica|como estudar/, "learning.plan", 0.86, "aprendizado", "learning keyword"),
      match(text, /isso esta errado|corrige isso|prefiro que|nao responda mais|salve isso como padrao/, "feedback.learning", 0.9, "feedback", "feedback keyword")
    ];
    return matches.find(Boolean) ?? { intent: "general.question", confidence: 0.55, domain: "geral", agent: "GeneralAssistantAgent", reason: "fallback local" };
  }
}

export const intentRouterService = new IntentRouterService();
