import { randomUUID } from "node:crypto";
import { planSchema, reviewSchema, type AgentSyncProviders, type CycleRecord, type EligibleTask } from "./contracts.js";

export type CoordinatorOptions = {
  getContext: () => Promise<{ text: string; eligibleTasks: EligibleTask[] }>;
  providers: AgentSyncProviders;
  persist: (record: CycleRecord) => Promise<void>;
  maxCycles: number;
  now?: () => Date;
};

export async function runSupervisedCycles(options: CoordinatorOptions): Promise<CycleRecord[]> {
  if (!Number.isInteger(options.maxCycles) || options.maxCycles < 1 || options.maxCycles > 3) {
    throw new Error("maxCycles deve ficar entre 1 e 3 para limitar uso e impacto.");
  }

  const records: CycleRecord[] = [];
  let context = await options.getContext();
  const attemptedTaskIds = new Set<string>();

  for (let index = 0; index < options.maxCycles; index += 1) {
    const availableTasks = context.eligibleTasks.filter((task) => !attemptedTaskIds.has(task.id));
    if (availableTasks.length === 0) {
      records.push(await save({
        runId: randomUUID(), taskId: "SYNC-001", result: "blocked",
        summary: "Não há tarefa elegível segundo as dependências do plano mestre.",
        findings: [], testsPassed: false
      }, options));
      break;
    }

    const planningContext = `${context.text}\n\nTarefas já tratadas nesta execução e que não podem ser repetidas: ${[...attemptedTaskIds].join(", ") || "nenhuma"}\nTarefas elegíveis nesta iteração: ${JSON.stringify(availableTasks)}`;
    const proposed = planSchema.parse(await options.providers.plan(planningContext));
    if (proposed.decision !== "execute" || !proposed.taskId) {
      const result = proposed.decision === "approval_required" ? "approval_required" : "blocked";
      records.push(await save({
        runId: randomUUID(), taskId: proposed.taskId ?? "SYNC-001", result,
        summary: proposed.reason || proposed.objective, findings: [], testsPassed: false
      }, options));
      break;
    }

    const selectedTask = availableTasks.find((task) => task.id === proposed.taskId);
    if (!selectedTask) {
      records.push(await save({
        runId: randomUUID(), taskId: proposed.taskId, result: "blocked",
        summary: "O planejador selecionou uma tarefa que não está elegível no estado local.",
        findings: [], testsPassed: false
      }, options));
      break;
    }
    if (proposed.risk !== "low") {
      records.push(await save({
        runId: randomUUID(), taskId: selectedTask.id, result: "approval_required",
        summary: "A classificação de risco exige aprovação humana antes de executar.",
        findings: [proposed.reason], testsPassed: false
      }, options));
      break;
    }

    attemptedTaskIds.add(selectedTask.id);
    const developerReport = await options.providers.develop(proposed);
    const [tests, gitDiffStat, gitDiff] = await Promise.all([options.providers.test(), options.providers.diffStat(), options.providers.diff()]);
    if (!tests.passed) {
      records.push(await save({
        runId: randomUUID(), taskId: selectedTask.id, result: "validation_failed",
        summary: "Validações locais falharam; a revisão GPT não foi executada.",
        findings: [tests.evidence.slice(0, 500)], testsPassed: false
      }, options));
      break;
    }
    if (gitDiff.trim() === "Sem diff local detectável.") {
      records.push(await save({
        runId: randomUUID(), taskId: selectedTask.id, result: "no_changes",
        summary: "O desenvolvedor não produziu alterações; a revisão GPT não foi executada e a tarefa não avançou.",
        findings: [developerReport.slice(0, 500), "Validações gerais passaram, mas não comprovam implementação dos critérios da tarefa."],
        testsPassed: true
      }, options));
      break;
    }
    const review = reviewSchema.parse(await options.providers.review({
      task: selectedTask,
      objective: proposed.objective,
      instructions: proposed.instructions,
      acceptanceCriteria: proposed.acceptanceCriteria,
      developerReport,
      gitDiffStat,
      gitDiff,
      tests: tests.evidence,
      testsPassed: tests.passed
    }));

    const result = review.decision === "approval_required"
      ? "approval_required"
      : review.decision === "stop"
        ? "review_rejected"
          : review.testsPassed && tests.passed
          ? "reviewed_continue"
          : "review_rejected";
    const record = await save({
      runId: randomUUID(), taskId: selectedTask.id, result,
      summary: review.summary,
      findings: review.findings,
      testsPassed: tests.passed
    }, options);
    records.push(record);

    if (result !== "reviewed_continue" || index === options.maxCycles - 1) break;
    context = await options.getContext();
  }

  return records;
}

async function save(record: Omit<CycleRecord, "completedAt">, options: CoordinatorOptions): Promise<CycleRecord> {
  const completed: CycleRecord = { ...record, completedAt: (options.now ?? (() => new Date()))().toISOString() };
  await options.persist(completed);
  return completed;
}
