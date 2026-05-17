import { redactSensitive } from "../../utils/redact.js";
import type { BrainAskResponse, BrainSourceItem } from "./brain.types.js";
import { safetyPolicyService } from "./safetyPolicy.service.js";

export class AnswerVerifierService {
  verify(input: { question: string; answer: string; sources: BrainSourceItem[]; needsConfirmation?: boolean; caution?: boolean }) {
    const safety = safetyPolicyService.evaluate(input.question);
    let answer = String(redactSensitive(input.answer));
    const suggestedNextActions: string[] = [];
    let needsConfirmation = Boolean(input.needsConfirmation || safety.needsConfirmation);

    if (safety.blocked) {
      answer = "Nao posso exibir, salvar ou repetir segredos. Posso registrar apenas que a credencial esta configurada, ausente, valida ou invalida.";
      needsConfirmation = false;
    }

    if (!input.sources.length && /meus|minhas|sistema|financeiro|documentos|tarefas|integracoes/i.test(input.question)) {
      suggestedNextActions.push("Consultar dados internos novamente em modo Deep.");
      answer += "\n\nNao encontrei contexto interno suficiente para afirmar mais detalhes sem consultar dados adicionais.";
    }

    if (input.caution || safety.needsCaution) {
      answer += "\n\nObservacao: para temas medicos, juridicos, fiscais, contabeis ou financeiros de alto impacto, use isto como apoio e valide com um profissional.";
    }

    if (needsConfirmation) {
      suggestedNextActions.push("Confirmar explicitamente antes de executar qualquer acao sensivel.");
    }

    return { answer, needsConfirmation, suggestedNextActions };
  }

  assertNoSecretInResponse(response: BrainAskResponse) {
    const serialized = JSON.stringify(response);
    return !/(sk-|AIza|Bearer\s+|password|apiKey|api_key|secret|token":")/i.test(serialized);
  }
}

export const answerVerifierService = new AnswerVerifierService();
