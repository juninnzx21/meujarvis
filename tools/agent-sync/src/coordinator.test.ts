import assert from "node:assert/strict";
import test from "node:test";
import { runSupervisedCycles } from "./coordinator.js";
import type { AgentSyncProviders, EligibleTask } from "./contracts.js";

const task: EligibleTask = { id: "MEM-001", priority: "P1", dependencies: ["TEST-001"], scope: "Memória", status: "TODO" };

function providers(overrides: Partial<AgentSyncProviders> = {}): AgentSyncProviders {
  return {
    plan: async () => ({ decision: "execute", taskId: task.id, objective: "Cobrir isolamento", instructions: "Teste local", acceptanceCriteria: ["sem vazamento"], risk: "low", reason: "elegível" }),
    develop: async () => "Implementação concluída localmente.",
    test: async () => ({ passed: true, evidence: "1 teste passou." }),
    diffStat: async () => "1 arquivo alterado.",
    diff: async () => "diff local resumido.",
    review: async () => ({ decision: "continue", summary: "Aceito.", findings: [], testsPassed: true, approvalReason: "" }),
    ...overrides
  };
}

test("interrompe sem executar se o planejador escolher tarefa inelegível", async () => {
  let developed = false;
  const records = await runSupervisedCycles({
    getContext: async () => ({ text: "context", eligibleTasks: [task] }),
    providers: providers({ plan: async () => ({ decision: "execute", taskId: "SEC-001", objective: "x", instructions: "x", acceptanceCriteria: [], risk: "low", reason: "x" }), develop: async () => { developed = true; return "" } }),
    persist: async () => undefined,
    maxCycles: 1
  });
  assert.equal(developed, false);
  assert.equal(records[0]?.result, "blocked");
});

test("ciclos são encadeados somente após revisão aprovada e ficam limitados", async () => {
  let plans = 0;
  let persisted = 0;
  const secondTask: EligibleTask = { ...task, id: "MEM-002", scope: "Busca de memória" };
  const records = await runSupervisedCycles({
    getContext: async () => ({ text: "context", eligibleTasks: [task, secondTask] }),
    providers: providers({ plan: async (context) => { plans += 1; const taskId = context.includes("já tratadas nesta execução e que não podem ser repetidas: MEM-001") ? secondTask.id : task.id; return { decision: "execute", taskId, objective: "x", instructions: "x", acceptanceCriteria: ["ok"], risk: "low", reason: "" }; } }),
    persist: async () => { persisted += 1; },
    maxCycles: 2,
    now: () => new Date("2026-10-17T00:00:00.000Z")
  });
  assert.equal(plans, 2);
  assert.equal(persisted, 2);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.taskId), ["MEM-001", "MEM-002"]);
  assert.ok(records.every((record) => record.result === "reviewed_continue"));
});

test("para o encadeamento quando a revisão exige aprovação humana", async () => {
  let plans = 0;
  const records = await runSupervisedCycles({
    getContext: async () => ({ text: "context", eligibleTasks: [task] }),
    providers: providers({
      plan: async () => { plans += 1; return { decision: "execute", taskId: task.id, objective: "x", instructions: "x", acceptanceCriteria: [], risk: "low", reason: "" }; },
      review: async () => ({ decision: "approval_required", summary: "Aprovação necessária.", findings: ["impacto externo"], testsPassed: true, approvalReason: "deploy" })
    }),
    persist: async () => undefined,
    maxCycles: 3
  });
  assert.equal(plans, 1);
  assert.equal(records[0]?.result, "approval_required");
});

test("não chama o revisor GPT quando validações locais falham", async () => {
  let reviewed = false;
  const records = await runSupervisedCycles({
    getContext: async () => ({ text: "context", eligibleTasks: [task] }),
    providers: providers({
      test: async () => ({ passed: false, evidence: "backend: FAIL" }),
      review: async () => { reviewed = true; return { decision: "continue", summary: "", findings: [], testsPassed: true, approvalReason: "" }; }
    }),
    persist: async () => undefined,
    maxCycles: 1
  });
  assert.equal(reviewed, false);
  assert.equal(records[0]?.result, "validation_failed");
  assert.equal(records[0]?.testsPassed, false);
});

test("não chama o revisor nem avança tarefa sem diff mesmo com testes gerais aprovados", async () => {
  let reviewed = false;
  const records = await runSupervisedCycles({
    getContext: async () => ({ text: "context", eligibleTasks: [task] }),
    providers: providers({
      develop: async () => "Não consegui acessar o banco, então não implementei.",
      review: async () => { reviewed = true; return { decision: "continue", summary: "Aceito.", findings: [], testsPassed: true, approvalReason: "" }; },
      diff: async () => "Sem diff local detectável."
    }),
    persist: async () => undefined,
    maxCycles: 1
  });

  assert.equal(reviewed, false);
  assert.equal(records[0]?.result, "no_changes");
  assert.equal(records[0]?.testsPassed, true);
  assert.match(records[0]?.summary ?? "", /não produziu alterações/u);
});

test("registra rejeição somente quando o revisor é realmente chamado", async () => {
  let reviewed = false;
  const records = await runSupervisedCycles({
    getContext: async () => ({ text: "context", eligibleTasks: [task] }),
    providers: providers({
      review: async () => { reviewed = true; return { decision: "stop", summary: "Critérios não atendidos.", findings: ["Falta isolamento"], testsPassed: true, approvalReason: "" }; }
    }),
    persist: async () => undefined,
    maxCycles: 1
  });

  assert.equal(reviewed, true);
  assert.equal(records[0]?.result, "review_rejected");
  assert.equal(records[0]?.testsPassed, true);
});

test("não repete uma tarefa já revisada no mesmo encadeamento", async () => {
  const secondTask: EligibleTask = { ...task, id: "MEM-002", scope: "Busca de memória" };
  const planned: string[] = [];
  const records = await runSupervisedCycles({
    getContext: async () => ({ text: "context", eligibleTasks: [task, secondTask] }),
    providers: providers({ plan: async (context) => {
      if (planned.length === 1) {
        assert.match(context, /já tratadas nesta execução.*MEM-001/);
        assert.match(context, /Tarefas elegíveis nesta iteração:.*MEM-002/);
      }
      const chosen = planned.length === 0 ? task.id : secondTask.id;
      planned.push(chosen);
      return { decision: "execute", taskId: chosen, objective: "x", instructions: "x", acceptanceCriteria: ["ok"], risk: "low", reason: "" };
    } }),
    persist: async () => undefined,
    maxCycles: 2
  });
  assert.deepEqual(planned, ["MEM-001", "MEM-002"]);
  assert.deepEqual(records.map((record) => record.taskId), ["MEM-001", "MEM-002"]);
});
