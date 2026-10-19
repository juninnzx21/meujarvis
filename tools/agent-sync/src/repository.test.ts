import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentState, parseBacklog } from "./repository.js";
import { buildDeveloperPrompt, codexEnvironment, disposablePostgresIdentityValidationArgs, isLocalTestDatabase, isVerifiedDisposableTestDatabase, npmInvocation } from "./runtime.js";
import type { PlannedTask } from "./contracts.js";
import { reviewSystemPrompt } from "./openai-provider.js";

test("backlog parser accepts explicit dependencies and ignores human decision gates", () => {
  const tasks = parseBacklog([
    "| ID | Prioridade | Dependências | Escopo / critério de aceite | Status inicial |",
    "| MEM-001 | P1 | TEST-001 | Isolamento | TODO |",
    "| DEV-003 | P3 | Decisão de produto | Cliente iOS | TODO |",
    "| TEST-001 | P0 | — | Banco isolado | DONE_VERIFIED |"
  ].join("\n"));
  assert.deepEqual(tasks.map((task) => task.id), ["MEM-001", "TEST-001"]);
  assert.deepEqual(tasks[0]?.dependencies, ["TEST-001"]);
});

test("state parser accepts null nextTaskId when no eligible task is recorded", () => {
  const state = parseAgentState({ tasks: [], nextTaskId: null });
  assert.equal(state.nextTaskId, null);
  assert.equal(parseAgentState({ tasks: [], nextTaskId: "OBS-002" }).nextTaskId, "OBS-002");
});

test("state parser accepts null activeTaskId when no task is reserved", () => {
  const state = parseAgentState({ tasks: [], activeTaskId: null });
  assert.equal(state.activeTaskId, null);
});

test("banco do Agent Sync deve ser PostgreSQL local com nome de teste", () => {
  assert.equal(isLocalTestDatabase("postgresql://agent:local@127.0.0.1:55433/jarvis_agent_sync_test"), true);
  assert.equal(isLocalTestDatabase("postgresql://agent:local@db-prod.example/jarvis"), false);
  assert.equal(isLocalTestDatabase("postgresql://agent:local@localhost/jarvis"), false);
  assert.equal(isLocalTestDatabase("not-a-url"), false);
});

test("rejeita destinos apenas semelhantes ao banco descartável antes de iniciar validações", () => {
  assert.equal(isLocalTestDatabase("postgresql://agent:synthetic@127.0.0.1:55432/jarvis_agent_sync_test"), false);
  assert.equal(isLocalTestDatabase("postgresql://agent:synthetic@127.0.0.1:55433/jarvis_prod"), false);
  assert.equal(isLocalTestDatabase("postgresql://agent:synthetic@localhost:55433/jarvis_agent_sync_test"), false);
  assert.equal(isVerifiedDisposableTestDatabase("postgresql://agent:synthetic@127.0.0.1:55432/jarvis_agent_sync_test"), false);
});

test("validações executam npm-cli.js pelo Node, sem depender de npm.cmd no spawn", () => {
  const cliPath = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
  const invocation = npmInvocation(["exec", "--prefix", "backend", "--", "prisma", "migrate", "deploy"], cliPath);
  assert.equal(invocation.executable, process.execPath);
  assert.deepEqual(invocation.args, [cliPath, "exec", "--prefix", "backend", "--", "prisma", "migrate", "deploy"]);
  assert.throws(() => npmInvocation(["--version"], ""), /npm-cli\.js não foi resolvido/);
});

test("validação de identidade PostgreSQL usa caminho do verificador relativo à raiz do repositório", () => {
  assert.deepEqual(disposablePostgresIdentityValidationArgs, [
    "exec", "--prefix", "backend", "--", "tsx", "backend/src/test-utils/verifyDisposablePostgres.ts"
  ]);
});

test("contexto do Codex explica validação no host sem expor URL de banco", () => {
  const task: PlannedTask = {
    decision: "execute",
    taskId: "MEM-001",
    objective: "Adicionar regressões para isolamento de memória",
    instructions: "Siga docs/jarvis/tasks/MEM-001.md",
    acceptanceCriteria: ["Teste de isolamento por usuário"],
    risk: "low",
    reason: "Elegível"
  };
  const prompt = buildDeveloperPrompt(task, [
    "test-database-identity: PASS — confirmado",
    "test-database-migrations: PASS — concluído",
    "backend: PASS — 82 testes",
    "frontend: PASS — 49 testes",
    "git diff --check: PASS",
    "DATABASE_URL=postgresql://user:password@127.0.0.1:55433/jarvis_agent_sync_test"
  ].join("\n"), "Critérios detalhados de teste.");

  assert.match(prompt, /Preflight do coordenador no host confiável passou/u);
  assert.match(prompt, /não recebe DATABASE_URL nem JARVIS_AGENT_SYNC_TEST_DATABASE_URL/u);
  assert.match(prompt, /não significa que o banco descartável esteja indisponível/u);
  assert.match(prompt, /test-database-identity, test-database-migrations, backend, frontend, git diff --check/u);
  assert.match(prompt, /Critérios detalhados de teste/u);
  assert.doesNotMatch(prompt, /postgresql:\/\/user:password@/u);
});

test("ambiente do Codex mantém as credenciais do banco e da OpenAI fora do sandbox", () => {
  const environment = codexEnvironment({
    PATH: "C:\\Windows\\System32",
    DATABASE_URL: "postgresql://test-user:test-password@127.0.0.1/jarvis_agent_sync_test",
    JARVIS_AGENT_SYNC_TEST_DATABASE_URL: "postgresql://test-user:test-password@127.0.0.1/jarvis_agent_sync_test",
    OPENAI_API_KEY: "synthetic-openai-test-key-do-not-use"
  });

  assert.equal(environment.PATH, "C:\\Windows\\System32");
  assert.equal(environment.DATABASE_URL, undefined);
  assert.equal(environment.JARVIS_AGENT_SYNC_TEST_DATABASE_URL, undefined);
  assert.equal(environment.OPENAI_API_KEY, undefined);
});

test("revisão distingue evidência do host dos limites do sandbox, mas exige diff", () => {
  assert.match(reviewSystemPrompt, /evidência do coordenador executada no host confiável/u);
  assert.match(reviewSystemPrompt, /não contradiz essa evidência/u);
  assert.match(reviewSystemPrompt, /se não houver implementação, rejeite/u);
});
