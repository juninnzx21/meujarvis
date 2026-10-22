import { describe, expect, it } from "vitest";
import { canApproveRelease, inspectReleaseEvidence, RELEASE_REPOSITORY, sameReleaseArtifact } from "./githubEvidence.js";

function response(status: number, value: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => value };
}

function fixture(overrides: { branch?: string; expired?: boolean; digest?: string; runSha?: string; artifactId?: number } = {}) {
  const digest = overrides.digest ?? `sha256:${"a".repeat(64)}`;
  const values: Record<string, unknown> = {
    [`https://api.github.com/repos/${RELEASE_REPOSITORY}/actions/runs/42`]: {
      id: 42, head_sha: overrides.runSha ?? "a".repeat(40), head_branch: overrides.branch ?? "main", event: "push", conclusion: "success",
      head_repository: { full_name: RELEASE_REPOSITORY }, html_url: "https://github.com/juninnzx21/meujarvis/actions/runs/42"
    },
    [`https://api.github.com/repos/${RELEASE_REPOSITORY}/actions/artifacts/77`]: {
      id: overrides.artifactId ?? 77, name: "jarvis-web", digest, size_in_bytes: 12345, expired: overrides.expired ?? false, workflow_run: { id: 42 }
    },
    [`https://api.github.com/repos/${RELEASE_REPOSITORY}/commits/${"a".repeat(40)}/check-runs?filter=latest&per_page=100`]: {
      check_runs: ["validate", "desktop", "android"].map((name) => ({ name, head_sha: "a".repeat(40), conclusion: "success" }))
    },
    [`https://api.github.com/repos/${RELEASE_REPOSITORY}/branches/main/protection`]: {
      enforce_admins: { enabled: true }, required_status_checks: { contexts: ["validate", "desktop", "android"] }
    }
  };
  return async (url: string) => response(url.endsWith("/protection") ? 200 : 200, values[url]);
}

describe("evidências de release", () => {
  const sha = "a".repeat(40);
  const ids = { workflowRunId: 42n, artifactId: 77n, commitSha: sha };

  it("confirma somente SHA, run, checks e digest do artefato correspondentes", async () => {
    const evidence = await inspectReleaseEvidence(ids, fixture());
    expect(evidence.gates.ci.passed).toBe(true);
    expect(evidence.gates.artifact.passed).toBe(true);
    expect(evidence.gates.protectedBranch.passed).toBe(true);
    expect(evidence.artifactDigest).toBe("a".repeat(64));
    expect(sameReleaseArtifact({ commitSha: sha, artifactDigest: "a".repeat(64) }, evidence)).toBe(true);
  });

  it("envia o token opcional somente às URLs fixas da API oficial do GitHub", async () => {
    const calls: Array<{ url: string; authorization?: string }> = [];
    const fixtureFetcher = fixture();
    await inspectReleaseEvidence(ids, async (url, init) => {
      const headers = init?.headers as Record<string, string>;
      calls.push({ url, authorization: headers.Authorization });
      return fixtureFetcher(url);
    }, "synthetic-read-only-token");

    expect(calls).toHaveLength(4);
    expect(calls.every((call) => call.url.startsWith(`https://api.github.com/repos/${RELEASE_REPOSITORY}/`))).toBe(true);
    expect(calls.every((call) => call.authorization === "Bearer synthetic-read-only-token")).toBe(true);
  });

  it("nao envia cabecalho Authorization quando nao ha credencial configurada", async () => {
    const calls: Array<string | undefined> = [];
    const fixtureFetcher = fixture();
    await inspectReleaseEvidence(ids, async (url, init) => {
      const headers = init?.headers as Record<string, string>;
      calls.push(headers.Authorization);
      return fixtureFetcher(url);
    }, "");

    expect(calls).toHaveLength(4);
    expect(calls.every((authorization) => authorization === undefined)).toBe(true);
  });

  it("rejeita workflow de branch diferente, mesmo com checks verdes", async () => {
    const evidence = await inspectReleaseEvidence(ids, fixture({ branch: "codex/feature" }));
    expect(evidence.gates.ci.passed).toBe(false);
    expect(canApproveRelease(evidence.gates)).toBe(false);
  });

  it("bloqueia artefato expirado ou digest inválido", async () => {
    const expired = await inspectReleaseEvidence(ids, fixture({ expired: true }));
    const invalidDigest = await inspectReleaseEvidence(ids, fixture({ digest: "sha256:invalid" }));
    expect(expired.expired).toBe(true);
    expect(expired.gates.artifact.passed).toBe(false);
    expect(invalidDigest.gates.artifact.passed).toBe(false);
  });

  it("rejeita resposta do GitHub cujo artefato nao corresponde ao ID solicitado", async () => {
    const evidence = await inspectReleaseEvidence(ids, fixture({ artifactId: 78 }));
    expect(evidence.gates.artifact.passed).toBe(false);
    expect(evidence.artifactDigest).toBeNull();
  });

  it("mantém candidato bloqueado enquanto staging, backup, rollback e health não forem comprovados", async () => {
    const evidence = await inspectReleaseEvidence(ids, fixture());
    expect(evidence.gates.staging.passed).toBe(false);
    expect(evidence.gates.backupRestore.passed).toBe(false);
    expect(evidence.gates.rollback.passed).toBe(false);
    expect(evidence.gates.healthChecks.passed).toBe(false);
    expect(canApproveRelease(evidence.gates)).toBe(false);
  });
});
