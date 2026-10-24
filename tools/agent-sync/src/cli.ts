import { dryRun, runAllowedValidations, runOnce } from "./runtime.js";

const command = process.argv[2];

try {
  if (command === "dry-run") {
    const report = await dryRun();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.openAiConfigured) process.stdout.write("GPT planner/reviewer: not_configured (OPENAI_API_KEY ausente).\n");
  } else if (command === "validate-local") {
    const result = await runAllowedValidations();
    process.stdout.write(`${JSON.stringify({ result: result.passed ? "LOCAL_VALIDATION_OK" : "LOCAL_VALIDATION_FAILED", evidence: result.evidence }, null, 2)}\n`);
    if (!result.passed) process.exitCode = 1;
  } else if (command === "cycle") {
    const maxCycles = Number(process.env.JARVIS_AGENT_SYNC_MAX_CYCLES ?? "1");
    const records = await runOnce({
      apiKey: process.env.OPENAI_API_KEY ?? "",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      maxCycles
    });
    process.stdout.write(`${JSON.stringify(records, null, 2)}\n`);
  } else {
    throw new Error("Uso: npm run dry-run | npm run validate-local | npm run cycle");
  }
} catch (error) {
  const rawMessage = error instanceof Error ? error.message : "Erro não identificado.";
  const message = rawMessage
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]+)\b/gi, "[REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[REDACTED]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/gi, "[REDACTED]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED]")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]");
  process.stderr.write(`Agent Sync parado com segurança: ${message}\n`);
  process.exitCode = 1;
}
