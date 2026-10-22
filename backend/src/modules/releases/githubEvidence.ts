import { env } from "../../config/env.js";

export const REQUIRED_RELEASE_CHECKS = ["validate", "desktop", "android"] as const;
export const RELEASE_REPOSITORY = "juninnzx21/meujarvis";

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type Fetcher = (input: string, init?: RequestInit) => Promise<FetchResponse>;
type JsonRecord = Record<string, unknown>;

export type ReleaseGateSnapshot = {
  ci: { passed: boolean; requiredChecks: string[]; conclusion: string | null };
  artifact: { passed: boolean; expired: boolean; digest: string | null; size: number | null };
  protectedBranch: { passed: boolean; verified: boolean };
  staging: { passed: false };
  backupRestore: { passed: false };
  rollback: { passed: false };
  healthChecks: { passed: false };
};

export type ReleaseEvidence = {
  commitSha: string;
  sourceBranch: string;
  ciRunUrl: string | null;
  artifactName: string | null;
  artifactDigest: string | null;
  artifactSize: bigint | null;
  gates: ReleaseGateSnapshot;
  blockedReasons: string[];
  expired: boolean;
};

const asRecord = (value: unknown): JsonRecord => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};

function defaultFetcher(input: string, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(8000) });
}

async function githubJson(fetcher: Fetcher, path: string, apiToken: string): Promise<{ status: number; body: JsonRecord }> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "JARVIS-Release-Gate" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const response = await fetcher(`https://api.github.com/repos/${RELEASE_REPOSITORY}${path}`, {
    headers
  });
  if (!response.ok) return { status: response.status, body: {} };
  return { status: response.status, body: asRecord(await response.json()) };
}

export async function inspectReleaseEvidence(input: {
  workflowRunId: bigint;
  artifactId: bigint;
  commitSha: string;
}, fetcher: Fetcher = defaultFetcher, apiToken = env.GITHUB_RELEASE_READ_TOKEN): Promise<ReleaseEvidence> {
  const [runResult, artifactResult, checksResult, protectionResult] = await Promise.all([
    githubJson(fetcher, `/actions/runs/${input.workflowRunId}`, apiToken),
    githubJson(fetcher, `/actions/artifacts/${input.artifactId}`, apiToken),
    githubJson(fetcher, `/commits/${input.commitSha}/check-runs?filter=latest&per_page=100`, apiToken),
    githubJson(fetcher, "/branches/main/protection", apiToken)
  ]);
  const run = runResult.body;
  const artifact = artifactResult.body;
  const checkRuns = Array.isArray(checksResult.body.check_runs) ? checksResult.body.check_runs.map(asRecord) : [];
  const contexts = new Map(checkRuns.map((check) => [String(check.name), check]));
  const shaChecksPassed = checkRuns.every((check) => check.head_sha === input.commitSha);
  const requiredChecks = REQUIRED_RELEASE_CHECKS.filter((name) => contexts.get(name)?.conclusion === "success");
  const ciPassed = runResult.status === 200
    && run.head_sha === input.commitSha
    && run.head_branch === "main"
    && asRecord(run.head_repository).full_name === RELEASE_REPOSITORY
    && run.event === "push"
    && run.conclusion === "success"
    && checksResult.status === 200
    && shaChecksPassed
    && REQUIRED_RELEASE_CHECKS.every((name) => contexts.get(name)?.conclusion === "success");

  const digestRaw = typeof artifact.digest === "string" ? artifact.digest : null;
  const digest = digestRaw?.replace(/^sha256:/, "") ?? null;
  const digestValid = Boolean(digest && /^[a-f0-9]{64}$/.test(digest));
  const expired = artifact.expired === true;
  const artifactPassed = artifactResult.status === 200
    && String(artifact.id ?? "") === input.artifactId.toString()
    && !expired
    && String(asRecord(artifact.workflow_run).id ?? "") === input.workflowRunId.toString()
    && digestValid
    && typeof artifact.name === "string"
    && Number.isSafeInteger(artifact.size_in_bytes)
    && Number(artifact.size_in_bytes) > 0;

  const protection = asRecord(protectionResult.body);
  const requiredStatusChecks = asRecord(protection.required_status_checks);
  const requiredContexts = Array.isArray(requiredStatusChecks.contexts) ? requiredStatusChecks.contexts : [];
  const enforceAdmins = asRecord(protection.enforce_admins).enabled === true;
  const protectedBranchVerified = protectionResult.status === 200
    && enforceAdmins
    && REQUIRED_RELEASE_CHECKS.every((name) => requiredContexts.includes(name));

  const gates: ReleaseGateSnapshot = {
    ci: { passed: ciPassed, requiredChecks, conclusion: typeof run.conclusion === "string" ? run.conclusion : null },
    artifact: { passed: artifactPassed, expired, digest: artifactPassed ? digest : null, size: artifactPassed ? Number(artifact.size_in_bytes) : null },
    protectedBranch: { passed: protectedBranchVerified, verified: protectionResult.status === 200 },
    staging: { passed: false },
    backupRestore: { passed: false },
    rollback: { passed: false },
    healthChecks: { passed: false }
  };
  const blockedReasons: string[] = [];
  if (!ciPassed) blockedReasons.push("CI do commit exato em main não foi confirmada com sucesso.");
  if (!artifactPassed) blockedReasons.push(expired ? "Artefato do GitHub expirou." : "Artefato ativo e seu digest não foram confirmados para esta execução.");
  if (!protectedBranchVerified) blockedReasons.push(apiToken
    ? "Proteção obrigatória de main não pôde ser verificada via GitHub."
    : "Configure GITHUB_RELEASE_READ_TOKEN no backend; a branch protection exige autenticação de leitura e permanece não verificada.");
  blockedReasons.push("Validação operacional em staging ainda não comprovada.");
  blockedReasons.push("Backup e restauração ainda não foram comprovados.");
  blockedReasons.push("Rollback ainda não foi comprovado.");
  blockedReasons.push("Health checks autenticados ainda não foram comprovados.");

  return {
    commitSha: input.commitSha,
    sourceBranch: typeof run.head_branch === "string" ? run.head_branch : "unknown",
    ciRunUrl: typeof run.html_url === "string" ? run.html_url : null,
    artifactName: typeof artifact.name === "string" ? artifact.name : null,
    artifactDigest: artifactPassed ? digest : null,
    artifactSize: artifactPassed ? BigInt(Number(artifact.size_in_bytes)) : null,
    gates,
    blockedReasons,
    expired
  };
}

export function canApproveRelease(gates: unknown) {
  const record = asRecord(gates);
  const required = ["ci", "artifact", "protectedBranch", "staging", "backupRestore", "rollback", "healthChecks"];
  return required.every((key) => asRecord(record[key]).passed === true);
}

export function sameReleaseArtifact(candidate: { commitSha: string; artifactDigest: string | null }, evidence: ReleaseEvidence) {
  return candidate.commitSha === evidence.commitSha
    && Boolean(candidate.artifactDigest && evidence.artifactDigest && candidate.artifactDigest === evidence.artifactDigest)
    && evidence.gates.ci.passed
    && evidence.gates.artifact.passed;
}
