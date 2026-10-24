import { randomUUID } from "node:crypto";
import { appendFile, mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { execFile, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import { promisify } from "node:util";
import { runSupervisedCycles } from "./coordinator.js";
import type { CycleRecord, PlannedTask } from "./contracts.js";
import { createOpenAiProvider } from "./openai-provider.js";
import { parseBacklog, repositoryRoot, readTaskContext, git, gitExecutable } from "./repository.js";

const stateSchema = z.object({ version: z.literal(1), runs: z.array(z.object({
  runId: z.string(), taskId: z.string(), result: z.enum(["reviewed_continue", "blocked", "approval_required", "validation_failed", "no_changes", "review_rejected"]),
  summary: z.string(), findings: z.array(z.string()), testsPassed: z.boolean(), completedAt: z.string()
})) }).strict();
const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.state");
const stateFile = path.join(dataDir, "runs.json");
const lockFile = path.join(dataDir, "run.lock");
const execFileAsync = promisify(execFile);
const disposablePostgresContainer = "jarvis-agent-sync-postgres-test";

export type RuntimeConfig = { apiKey: string; model: string; maxCycles: number };

export function npmInvocation(args: string[], cliPath = process.env.JARVIS_AGENT_SYNC_NPM_CLI ?? process.env.npm_execpath) {
  if (!cliPath?.trim()) throw new Error("npm-cli.js não foi resolvido para as validações locais.");
  return { executable: process.execPath, args: [cliPath, ...args] };
}

export function codexEnvironment(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const names = ["PATH", "PATHEXT", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "CODEX_HOME", "CODEX_CLI_PATH", "JARVIS_AGENT_SYNC_GIT_EXECUTABLE", "JARVIS_AGENT_SYNC_NPM_CLI", "npm_execpath", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP"];
  return Object.fromEntries(names.flatMap((name) => source[name] ? [[name, source[name] as string]] : []));
}

export function buildDeveloperPrompt(task: PlannedTask, validationEvidence: string, taskSpec = "") {
  const validatedChecks = validationEvidence.split(/\r?\n/)
    .map((line) => line.match(/^(test-database-identity|test-database-migrations|backend|frontend): PASS\b/)?.[1])
    .filter((label): label is string => Boolean(label));
  if (/git diff --check: PASS/i.test(validationEvidence)) validatedChecks.push("git diff --check");
  const validationStatus = validatedChecks.length ? validatedChecks.join(", ") : "sem resumo de preflight disponível";
  const safeSpec = redactSensitive(taskSpec).slice(0, 12_000);
  return [
    `Implemente somente a tarefa ${task.taskId}: ${task.objective}`,
    `Escopo: ${task.instructions}`,
    `Critérios: ${task.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`,
    `Preflight do coordenador no host confiável passou imediatamente antes do ciclo: ${validationStatus}.`,
    "A validação PostgreSQL pertence ao coordenador fora do sandbox Codex. O sandbox do desenvolvedor tem rede desativada e não recebe DATABASE_URL nem JARVIS_AGENT_SYNC_TEST_DATABASE_URL por projeto. Portanto, a ausência dessas variáveis ou a impossibilidade de conectar do sandbox não significa que o banco descartável esteja indisponível. Não declare o ambiente global ausente por esse motivo; escreva os testes/código e o coordenador executará a suíte novamente no container PostgreSQL descartável verificado após sua alteração.",
    safeSpec ? `Especificação local da tarefa:\n${safeSpec}` : "Não há especificação complementar da tarefa.",
    "Leia AGENTS.md e as instruções persistentes. Não faça commit, push, merge, deploy, chamada externa, alteração em produção/VPS, migration ou exclusão de dados. Não leia nem revele segredos. Use apenas workspace-write local, sem rede e sem escalar permissões. Pare e relate somente bloqueios específicos que não possam ser resolvidos no código/testes locais."
  ].join("\n\n");
}

export async function codexCliStatus() {
  const executable = await resolveCodexExecutable();
  if (!executable) return { available: false, authenticated: false, executable: null as string | null };
  const result = spawnSync(executable, ["login", "status"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
    env: process.env
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const authenticated = !result.error && result.status === 0 && /(logged in|authenticated)/i.test(output);
  return { available: true, authenticated, executable };
}

async function resolveCodexExecutable(): Promise<string | null> {
  const candidates: string[] = [];
  const configured = process.env.CODEX_CLI_PATH?.trim();
  if (configured) candidates.push(configured);

  if (process.platform === "win32") {
    for (const name of ["codex.exe", "codex.com"]) {
      const found = await execFileAsync("where.exe", [name], { windowsHide: true, timeout: 5_000 })
        .then(({ stdout }) => stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), () => [] as string[]);
      candidates.push(...found);
    }
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const binRoot = path.join(localAppData, "OpenAI", "Codex", "bin");
      const versions = await readdir(binRoot, { withFileTypes: true }).catch(() => []);
      candidates.push(...versions.filter((entry) => entry.isDirectory()).map((entry) => path.join(binRoot, entry.name, "codex.exe")));
    }
    const appData = process.env.APPDATA;
    if (appData) candidates.push(path.join(appData, "npm", "node_modules", "@openai", "codex", "bin", "codex.exe"));
  } else {
    const found = await execFileAsync("which", ["codex"], { windowsHide: true, timeout: 5_000 })
      .then(({ stdout }) => stdout.trim().split(/\r?\n/).filter(Boolean), () => [] as string[]);
    candidates.push(...found);
  }

  for (const candidate of [...new Set(candidates)]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Continue through known installation locations without logging paths or errors.
    }
  }
  return null;
}

export async function dryRun(root = repositoryRoot) {
  const context = await readTaskContext(root);
  if (!context.branch.startsWith("codex/")) throw new Error("Dry-run bloqueado: branch de trabalho precisa usar o prefixo codex/.");
  const codexCli = await codexCliStatus();
  return {
    result: codexCli.available && codexCli.authenticated ? "DRY_RUN_OK" : "DRY_RUN_BLOCKED",
    branch: context.branch,
    commit: context.sha,
    workingTreeDirty: context.dirty,
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    isolatedTestDatabaseConfigured: isVerifiedDisposableTestDatabase(process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL?.trim() ?? ""),
    codexCliAvailable: codexCli.available,
    codexCliAuthenticated: codexCli.authenticated,
    eligibleTaskIds: context.eligibleTasks.map((task) => task.id),
    maxCyclesSupported: 3,
    defaultCycles: 1,
    schedulerEnabled: false,
    productionChangesEnabled: false
  };
}

export async function runOnce(config: RuntimeConfig, root = repositoryRoot): Promise<CycleRecord[]> {
  if (!config.apiKey.trim()) throw new Error("OPENAI_API_KEY ausente; o ciclo real não pode iniciar.");
  if (!isVerifiedDisposableTestDatabase(process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL?.trim() ?? "")) {
    throw new Error("Execução bloqueada antes de chamar qualquer modelo: configure e verifique o container PostgreSQL descartável jarvis-agent-sync-postgres-test, publicado somente em 127.0.0.1:55433 e sem armazenamento persistente.");
  }
  if (!Number.isInteger(config.maxCycles) || config.maxCycles < 1 || config.maxCycles > 3) throw new Error("Use 1 a 3 ciclos por execução.");
  const initialContext = await readTaskContext(root);
  if (!initialContext.branch.startsWith("codex/")) throw new Error("Execução bloqueada: use uma branch codex/ isolada.");
  if (initialContext.dirty) throw new Error("Execução bloqueada: o worktree está sujo. Preserve/revise as alterações e use um worktree limpo.");
  const codexCli = await codexCliStatus();
  if (!codexCli.available) throw new Error("Codex CLI não encontrado. Configure CODEX_CLI_PATH para o executável codex.exe ou instale a CLI oficial.");
  if (!codexCli.authenticated) throw new Error("Codex CLI não autenticado; valide a sessão local do Codex.");
  const lock = await acquireLock();
  try {
    const preflight = await runAllowedValidations(root);
    if (!preflight.passed) throw new Error(`Execução bloqueada: as validações locais falharam antes de chamar os modelos. ${preflight.evidence}`);
    const provider = createOpenAiProvider(config.apiKey, config.model);
    const codex = new Codex({
      codexPathOverride: codexCli.executable ?? undefined,
      env: codexEnvironment(),
      config: { default_permissions: "audit" },
      configOverrides: [secretFileDenyRule(root)]
    });
    const records = await runSupervisedCycles({
      getContext: async () => {
        const context = await readTaskContext(root);
        return {
          text: `${context.text}\n\nPreflight local validado pelo coordenador no host: ${preflightStatus(preflight.evidence)}. A conexão ao PostgreSQL fica no coordenador; o sandbox Codex não recebe a URL nem acesso de rede.`,
          eligibleTasks: context.eligibleTasks
        };
      },
      providers: {
        plan: provider.plan,
        develop: async (task) => {
          const thread = codex.startThread({ workingDirectory: root, sandboxMode: "workspace-write", approvalPolicy: "on-request", networkAccessEnabled: false, webSearchEnabled: false });
          const taskSpec = task.taskId ? await readTaskSpec(root, task.taskId) : "";
          const result = await thread.run(buildDeveloperPrompt(task, preflight.evidence, taskSpec), { signal: AbortSignal.timeout(25 * 60_000) });
          return redactSensitive(result.finalResponse);
        },
        test: () => runAllowedValidations(root),
        diffStat: () => git(root, ["diff", "--stat"]),
        diff: () => reviewableGitDiff(root),
        review: (input) => provider.review({ ...input, developerReport: redactSensitive(input.developerReport), tests: redactSensitive(input.tests), gitDiff: redactSensitive(input.gitDiff) })
      },
      maxCycles: config.maxCycles,
      persist: async (record) => {
        await appendRecord(record);
        if (record.result === "reviewed_continue") await markTaskInReview(root, record);
      }
    });
    return records;
  } finally {
    await lock.handle.close();
    const current = await readFile(lockFile, "utf8").catch(() => "");
    if (current === `${lock.runId}\n`) await unlink(lockFile).catch(() => undefined);
  }
}

export function isLocalTestDatabase(databaseUrl: string) {
  const validatedUrl = z.string().url().safeParse(databaseUrl);
  if (!validatedUrl.success) return false;

  try {
    const parsed = new URL(validatedUrl.data);
    return ["postgres:", "postgresql:"].includes(parsed.protocol)
      && parsed.hostname === "127.0.0.1"
      && parsed.port === "55433"
      && decodeURIComponent(parsed.pathname.slice(1)) === "jarvis_agent_sync_test"
      && [...parsed.searchParams.keys()].every((key) => ["schema", "connection_limit", "pool_timeout"].includes(key));
  } catch {
    return false;
  }
}

export function isVerifiedDisposableTestDatabase(databaseUrl: string) {
  if (!isLocalTestDatabase(databaseUrl)) return false;
  try {
    const url = new URL(databaseUrl);
    const result = spawnSync("docker", [
      "inspect",
      "--format",
      "{{json .}}",
      disposablePostgresContainer
    ], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000,
      maxBuffer: 256 * 1024
    });
    if (result.error || result.status !== 0 || !result.stdout) return false;
    const inspected = disposablePostgresInspectSchema.safeParse(JSON.parse(result.stdout));
    if (!inspected.success) return false;
    const container = inspected.data;
    const environment = new Map<string, string>();
    for (const entry of container.Config.Env) {
      const separator = entry.indexOf("=");
      environment.set(separator < 0 ? entry : entry.slice(0, separator), separator < 0 ? "" : entry.slice(separator + 1));
    }
    const portBindings = container.HostConfig.PortBindings["5432/tcp"] ?? [];
    const publishedBindings = Object.values(container.HostConfig.PortBindings).flat().length;
    const tmpfs = container.HostConfig.Tmpfs?.["/var/lib/postgresql/data"] ?? "";
    const networkAddresses = Object.values(container.NetworkSettings.Networks)
      .map((network) => network.IPAddress)
      .filter((address): address is string => Boolean(address));

    return container.State.Status === "running"
      && container.Name === `/${disposablePostgresContainer}`
      && container.State.Health.Status === "healthy"
      && container.Config.Image === "postgres:16-alpine"
      && environment.get("POSTGRES_DB") === "jarvis_agent_sync_test"
      && environment.get("POSTGRES_USER") === decodeURIComponent(url.username)
      && environment.get("POSTGRES_PASSWORD") === decodeURIComponent(url.password)
      && portBindings.length === 1
      && publishedBindings === 1
      && portBindings[0]?.HostIp === "127.0.0.1"
      && portBindings[0]?.HostPort === "55433"
      && container.Mounts.length === 0
      && /size=1g(?:,|$)/i.test(tmpfs)
      && networkAddresses.length > 0;
  } catch {
    return false;
  }
}

const disposablePostgresInspectSchema = z.object({
  Name: z.string(),
  State: z.object({ Status: z.string(), Health: z.object({ Status: z.string() }) }),
  Config: z.object({ Image: z.string(), Env: z.array(z.string()) }),
  HostConfig: z.object({
    PortBindings: z.record(z.string(), z.array(z.object({ HostIp: z.string(), HostPort: z.string() }))),
    Tmpfs: z.record(z.string(), z.string()).nullable().optional()
  }),
  Mounts: z.array(z.unknown()),
  NetworkSettings: z.object({
    Networks: z.record(z.string(), z.object({ IPAddress: z.string() }))
  })
});

async function acquireLock() {
  await mkdir(dataDir, { recursive: true });
  const runId = randomUUID();
  try {
    const handle = await open(lockFile, "wx", 0o600);
    await handle.writeFile(`${runId}\n`, "utf8");
    return { handle, runId };
  } catch {
    throw new Error("Outro ciclo já está em execução (lock ativo); nenhuma tarefa iniciada.");
  }
}

export const disposablePostgresIdentityValidationArgs = [
  "exec", "--prefix", "backend", "--", "tsx", "backend/src/test-utils/verifyDisposablePostgres.ts"
] as const;

export async function runAllowedValidations(root = repositoryRoot) {
  const testDatabaseUrl = process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL?.trim() ?? "";
  if (!isVerifiedDisposableTestDatabase(testDatabaseUrl)) {
    return { passed: false, evidence: "Validações bloqueadas: confirme o container PostgreSQL descartável verificado jarvis-agent-sync-postgres-test, vinculado somente a 127.0.0.1:55433 e sem volumes persistentes. Nenhum script do backend/frontend foi iniciado." };
  }
  const validations = [
    { label: "test-database-identity", args: [...disposablePostgresIdentityValidationArgs] },
    { label: "test-database-migrations", args: ["exec", "--prefix", "backend", "--", "prisma", "migrate", "deploy", "--schema", "backend/prisma/schema.prisma"] },
    { label: "backend", args: ["run", "validate", "--prefix", "backend"] },
    { label: "frontend", args: ["run", "validate", "--prefix", "frontend"] }
  ];
  const npmCliPath = await resolveNpmCliPath();
  const results: string[] = [];
  let passed = true;
  for (const validation of validations) {
    try {
      const invocation = npmInvocation(validation.args, npmCliPath);
      const { stdout, stderr } = await execFileAsync(invocation.executable, invocation.args, {
        cwd: root,
        timeout: 15 * 60_000,
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        env: safeValidationEnvironment(testDatabaseUrl, npmCliPath)
      });
      results.push(`${validation.label}: PASS — ${summarizeValidation([stdout, stderr].filter(Boolean).join("\n"))}`);
    } catch (error) {
      passed = false;
      const commandError = error as Error & { stdout?: string; stderr?: string; code?: number | string };
      const output = [commandError.stdout, commandError.stderr].filter(Boolean).join("\n");
      results.push(`${validation.label}: FAIL (${String(commandError.code ?? "unknown")}) — ${summarizeValidation(output, true)}`);
      break;
    }
  }
  const diffCheck = await git(root, ["diff", "--check"]).catch((error) => `git diff --check: FAIL (${redactSensitive(error instanceof Error ? error.message : "erro")})`);
  if (diffCheck.startsWith("git diff --check: FAIL")) passed = false;
  results.push(diffCheck ? `git diff --check: ${diffCheck}` : "git diff --check: PASS");
  return { passed, evidence: results.join("\n\n") };
}

function summarizeValidation(output: string, includeFailureContext = false) {
  const lines = output.split(/\r?\n/);
  const relevantPattern = /^(Test Files|Tests|Duration|✓|✔|❯|✖|×|not ok|error TS|Error:|AssertionError|> .* (build|typecheck|test)|npm error)|\b(?:ENOENT|FAIL|failed|exception)\b/i;
  const evidence = includeFailureContext
    ? lines.filter((line) => line.trim()).slice(-30)
    : lines.filter((line) => relevantPattern.test(line.trim())).slice(-8);
  return evidence.length > 0 ? redactSensitive(evidence.join("; ")).slice(0, includeFailureContext ? 2_400 : 1_200) : "validação executada; saída detalhada mantida apenas no terminal local";
}

async function resolveNpmCliPath(): Promise<string> {
  const candidates = [process.env.JARVIS_AGENT_SYNC_NPM_CLI, process.env.npm_execpath].filter((value): value is string => Boolean(value?.trim()));
  if (process.platform === "win32") {
    candidates.push(path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"));
    const npmCommands = await execFileAsync("where.exe", ["npm.cmd"], { windowsHide: true, timeout: 5_000 })
      .then(({ stdout }) => stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), () => [] as string[]);
    candidates.push(...npmCommands.map((command) => path.join(path.dirname(command), "node_modules", "npm", "bin", "npm-cli.js")));
  } else {
    const npmCommands = await execFileAsync("which", ["npm"], { windowsHide: true, timeout: 5_000 })
      .then(({ stdout }) => stdout.trim().split(/\r?\n/).filter(Boolean), () => [] as string[]);
    candidates.push(...npmCommands);
  }
  for (const candidate of [...new Set(candidates)]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Continue through known npm installations without logging paths or errors.
    }
  }
  throw new Error("npm-cli.js não foi encontrado; configure JARVIS_AGENT_SYNC_NPM_CLI ou execute o runner com npm instalado.");
}

function safeValidationEnvironment(databaseUrl: string, npmCliPath: string): NodeJS.ProcessEnv {
  const systemNames = ["PATH", "PATHEXT", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "USERPROFILE", "APPDATA", "LOCALAPPDATA"];
  const systemEnv = Object.fromEntries(systemNames.flatMap((name) => process.env[name] ? [[name, process.env[name] as string]] : []));
  return {
    ...systemEnv,
    JARVIS_AGENT_SYNC_NPM_CLI: npmCliPath,
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    NODE_ENV: "test",
    PORT: "0",
    APP_VERSION: "2.0.0-test",
    DATABASE_URL: databaseUrl,
    JARVIS_AGENT_SYNC_TEST_DATABASE_URL: databaseUrl,
    JWT_SECRET: "agent-sync-local-test-only-jwt-secret-000000000000",
    JWT_EXPIRES_IN: "5m",
    CORS_ORIGIN: "http://127.0.0.1",
    OPENAI_API_KEY: "",
    OPENAI_MODEL: "gpt-4o-mini",
    // Backend tests mock provider HTTP calls and require a configured provider for fallback coverage.
    GEMINI_API_KEY: "agent-sync-local-test-gemini-key",
    GEMINI_MODEL: "gemini-2.5-flash",
    N8N_WEBHOOK_URL: "",
    N8N_API_KEY: "",
    EVOLUTION_API_URL: "",
    EVOLUTION_API_KEY: "",
    EVOLUTION_INSTANCE: "",
    WHATSAPP_AUTO_REPLY: "false",
    HOME_ASSISTANT_URL: "",
    HOME_ASSISTANT_TOKEN: "",
    PIPER_TTS_URL: "",
    SETTINGS_ENCRYPTION_KEY: "agent-sync-local-test-only-settings-key-0000000000",
    TOTP_ENCRYPTION_KEY: "agent-sync-local-test-only-totp-encryption-key-000000000000",
    // Integration tests exercise the synthetic admin bootstrap; production is never invoked here.
    ALLOW_DEMO_LOGIN: "true",
    SCHEDULER_ENABLED: "false",
    SCHEDULER_INTERVAL_SECONDS: "60"
  };
}

function redactSensitive(value: string) {
  return value
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]+)\b/gi, "[REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[REDACTED]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/gi, "[REDACTED]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED]")
    .replace(/\bpostgres(?:ql)?:\/\/[^\s@/]+@/gi, "postgresql://[REDACTED]@")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[IP]");
}

async function reviewableGitDiff(root: string) {
  const executable = gitExecutable();
  const { stdout: trackedStdout } = await execFileAsync(executable, ["diff", "--name-only", "--diff-filter=ACMRTUXB", "-z"], { cwd: root, timeout: 10_000, windowsHide: true });
  const { stdout: stagedStdout } = await execFileAsync(executable, ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMRTUXB"], { cwd: root, timeout: 10_000, windowsHide: true });
  const { stdout: untrackedStdout } = await execFileAsync(executable, ["ls-files", "--others", "--exclude-standard", "-z"], { cwd: root, timeout: 10_000, windowsHide: true });
  const paths = [...trackedStdout, ...stagedStdout, ...untrackedStdout].flatMap((value) => value.split("\0")).filter(Boolean);
  const uniquePaths = [...new Set(paths)];
  const sensitivePath = uniquePaths.find(isSensitivePath);
  if (sensitivePath) throw new Error(`Revisão GPT bloqueada: caminho potencialmente sensível alterado (${path.basename(sensitivePath)}).`);

  const diffs: string[] = [];
  for (const args of [
    ["diff", "--no-ext-diff", "--no-color", "--unified=2"],
    ["diff", "--cached", "--no-ext-diff", "--no-color", "--unified=2"]
  ]) {
    const { stdout } = await execFileAsync(executable, args, { cwd: root, timeout: 15_000, windowsHide: true, maxBuffer: 1024 * 1024 });
    if (stdout) diffs.push(stdout);
  }

  for (const relative of uniquePaths.filter((item) => !trackedStdout.includes(item) && !stagedStdout.includes(item))) {
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error("Revisão GPT bloqueada: arquivo fora da raiz do repositório.");
    const content = await readFile(file);
    if (content.includes(0)) throw new Error(`Revisão GPT bloqueada: arquivo binário alterado (${path.basename(relative)}).`);
    diffs.push(`--- untracked: ${relative}\n${content.toString("utf8")}`);
  }

  const result = diffs.join("\n");
  if (Buffer.byteLength(result, "utf8") > 64 * 1024) throw new Error("Revisão GPT bloqueada: diff acima de 64 KiB; exige revisão humana local.");
  return result || "Sem diff local detectável.";
}

function isSensitivePath(file: string) {
  const normalized = file.replaceAll("\\", "/").toLowerCase();
  return /(^|\/)\.env(?:\.|$)|(^|\/)(?:secrets?|backups?|storage\/imports)(\/|$)|\.(?:pem|key|p12|pfx|sql|dump|backup|sqlite|sqlite3)$/i.test(normalized);
}

function preflightStatus(evidence: string) {
  const labels = evidence.split(/\r?\n/)
    .map((line) => line.match(/^(test-database-identity|test-database-migrations|backend|frontend): PASS\b/)?.[1])
    .filter((label): label is string => Boolean(label));
  if (/git diff --check: PASS/i.test(evidence)) labels.push("git diff --check");
  return labels.length ? labels.join(", ") : "validado sem detalhes adicionais";
}

async function readTaskSpec(root: string, taskId: string) {
  if (!/^[A-Z]+-\d{3}$/.test(taskId)) return "";
  return readFile(path.join(root, "docs", "jarvis", "tasks", `${taskId}.md`), "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
}

function secretFileDenyRule(root: string) {
  const envNames = [".env", ".env.local", ".env.production", ".env.development", ".env.test", ".env.production.local", ".env.development.local"];
  const denied = [
    ...["", "backend/", "frontend/"].flatMap((directory) => envNames.map((name) => `${directory}${name}`)),
    "backend/storage/imports",
    "backend/storage/documents",
    "backups",
    ".private-release",
    ".tools"
  ]
    .map((relative) => `"${path.resolve(root, relative).replaceAll("\\", "/")}"="deny"`);
  const writableRoot = `"${root.replaceAll("\\", "/")}"="write"`;
  return `permissions.audit.filesystem={${[writableRoot, ...denied].join(",")}}`;
}

async function appendRecord(record: CycleRecord) {
  await mkdir(dataDir, { recursive: true });
  let state = { version: 1 as const, runs: [] as CycleRecord[] };
  try {
    state = stateSchema.parse(JSON.parse(await readFile(stateFile, "utf8"))) as typeof state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("Estado local do Agent Sync inválido; preserve-o e revise manualmente.");
  }
  state.runs.push({ ...record, runId: record.runId || randomUUID() });
  const temporary = `${stateFile}.${record.runId}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  await rename(temporary, stateFile);
}

async function markTaskInReview(root: string, record: CycleRecord) {
  if (!/^[A-Z]+-\d{3}$/.test(record.taskId)) throw new Error("Registro recusado: identificador da tarefa inválido.");
  const statePath = path.join(root, "docs/jarvis/STATE.json");
  const state = JSON.parse(await readFile(statePath, "utf8")) as { lastRunUtc?: string; activeTaskId?: string; nextTaskId?: string | null; tasks?: Array<{ id: string; status: string }> };
  const task = state.tasks?.find((item) => item.id === record.taskId);
  if (!task || !["TODO", "READY"].includes(task.status)) throw new Error("Estado mudou durante o ciclo; progresso não foi avançado automaticamente.");
  task.status = "IN_REVIEW";
  state.activeTaskId = record.taskId;
  const statusById = new Map((state.tasks ?? []).map((item) => [item.id, item.status]));
  const plan = await readFile(path.join(root, "JARVIS_MASTER_PLAN.md"), "utf8");
  state.nextTaskId = parseBacklog(plan).find((candidate) => ["TODO", "READY"].includes(statusById.get(candidate.id) ?? "") && candidate.dependencies.every((dependency) => statusById.get(dependency) === "DONE_VERIFIED"))?.id ?? null;
  state.lastRunUtc = record.completedAt;
  const temporary = `${statePath}.${record.runId}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  await rename(temporary, statePath);
  await appendFile(path.join(root, "JARVIS_PROGRESS.md"), `\n- ${record.completedAt}: ${record.taskId} passou nas validações locais e na revisão automatizada; status atualizado para IN_REVIEW, aguardando inspeção humana.\n`, "utf8");
}
