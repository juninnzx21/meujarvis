import { isForbiddenAction } from "../../middlewares/security.js";
import { redactSensitive } from "../../utils/redact.js";

const sensitivePattern = /(senha|password|token|api[-_ ]?key|secret|jwt|bearer|private key|chave privada|credencial|root password|directadmin password|database password)/i;
const highRiskPattern = /(apagar banco|drop database|restore|reset --hard|rm -rf|formatar|fechadura|alarme|port[aã]o|garage|enviar em massa)/i;
const professionalAdvicePattern = /(diagnostico medico|remedio|processo judicial|imposto|fiscal|contabil|investir|investimento|tributario)/i;

export class SafetyPolicyService {
  evaluate(message: string) {
    const issues: string[] = [];
    if (isForbiddenAction(message) || highRiskPattern.test(message)) issues.push("confirmation_required");
    if (sensitivePattern.test(message)) issues.push("sensitive_data");
    if (professionalAdvicePattern.test(message)) issues.push("professional_caution");
    return {
      safeMessage: String(redactSensitive(message)),
      blocked: issues.includes("sensitive_data") && /mostre|exiba|qual e|qual é|me da|manda/i.test(message),
      needsConfirmation: issues.includes("confirmation_required"),
      needsCaution: issues.includes("professional_caution"),
      issues
    };
  }

  redact<T>(value: T): T {
    return redactSensitive(value) as T;
  }
}

export const safetyPolicyService = new SafetyPolicyService();
