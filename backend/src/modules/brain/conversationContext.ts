import type { BrainAskInput } from "./brain.types.js";

export function recentConversationHistory(history: BrainAskInput["history"] = []) {
  return (history ?? []).slice(-8).map((item) => ({ role: item.role, content: item.content.slice(0, 3000) }));
}

export function shouldSearchTheWeb(message: string, intent: string, history: BrainAskInput["history"] = []) {
  const text = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (/^(oi|ola|e ai|bom dia|boa tarde|boa noite|obrigado|obrigada|valeu)[!.?\s]*$/.test(text)) return false;
  const isFollowUp = /^(e (isso|essa|esse|ele|ela|por que|porque|como|quando|onde)|por que\??|porque\??|como assim\??|me explica( melhor)?|explica( melhor)?|mais detalhes|continua|qual deles\??|qual delas\??|e agora\??|e depois\??)[!.?\s]*$/.test(text);
  const followUpContext = isFollowUp && history?.some((item) => item.role === "user");
  const searchableIntent = ["general.question", "code.help", "learning.plan", "business.proposal", "deploy.help"].includes(intent)
    || (intent === "unknown" && followUpContext);
  if (!searchableIntent) return false;
  return intent === "general.question" || Boolean(followUpContext) || text.includes("?") || /pesquise|pesquisar|procure|busque|na internet|na web|fonte atual|fontes atuais|hoje|atualizado|atualizada|mais recente|ultimas noticias|preco atual|cotacao atual/.test(text);
}
