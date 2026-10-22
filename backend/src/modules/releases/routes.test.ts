import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  updateMany: vi.fn(),
  candidateCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("../../middlewares/auth.js", () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    const role = req.header("x-test-role") === "admin" ? "admin" : "user";
    Object.assign(req, { user: { id: "admin-user", email: "admin@example.invalid", name: "Admin", role } });
    next();
  }
}));
vi.mock("../../prisma/client.js", () => ({
  prisma: {
    releaseCandidate: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      updateMany: mocks.updateMany
    },
    releaseAuditEvent: { create: mocks.auditCreate },
    $transaction: mocks.transaction
  }
}));

import releaseRoutes from "./routes.js";

function testApp() {
  return express().use(express.json()).use("/releases", releaseRoutes);
}

const readyGates = {
  ci: { passed: true }, artifact: { passed: true }, protectedBranch: { passed: true },
  staging: { passed: true }, backupRestore: { passed: true }, rollback: { passed: true }, healthChecks: { passed: true }
};

describe("release approval routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
      releaseCandidate: {
        create: mocks.candidateCreate,
        findUnique: mocks.findUnique,
        findUniqueOrThrow: mocks.findUniqueOrThrow,
        updateMany: mocks.updateMany
      },
      releaseAuditEvent: { create: mocks.auditCreate }
    }));
  });

  it("blocks non-admin users before reading release data", async () => {
    await request(testApp()).get("/releases").expect(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("accepts only valid SemVer tags and PostgreSQL-safe positive IDs", async () => {
    mocks.candidateCreate.mockResolvedValue({
      id: "candidate-1", workflowRunId: 42n, artifactId: 77n, artifactSize: null, commitSha: "a".repeat(40),
      version: "v1.2.3", target: "staging", status: "DRAFT"
    });

    await request(testApp()).post("/releases/candidates").set("x-test-role", "admin").send({
      commitSha: "a".repeat(40), version: "v1.2.3", target: "staging", workflowRunId: "42", artifactId: "77"
    }).expect(201);
    await request(testApp()).post("/releases/candidates").set("x-test-role", "admin").send({
      commitSha: "a".repeat(40), version: "v01.2.3", target: "staging", workflowRunId: "9223372036854775808", artifactId: "77"
    }).expect(400);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("prevents the candidate requester from approving their own release", async () => {
    mocks.findUnique.mockResolvedValue({ id: "candidate-1", createdById: "admin-user" });

    await request(testApp()).post("/releases/candidate-1/approve").set("x-test-role", "admin").send({ reason: "Validacao independente" }).expect(403);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires recent MFA step-up even when all release gates are ready", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "candidate-1", createdById: "developer-user", status: "READY_FOR_APPROVAL", artifactDigest: "a".repeat(64),
      gates: readyGates, blockedReasons: [], commitSha: "b".repeat(40), workflowRunId: 42n, artifactId: 77n
    });

    const response = await request(testApp()).post("/releases/candidate-1/approve").set("x-test-role", "admin").send({ reason: "Validacao independente" }).expect(428);
    expect(response.body.message).toContain("MFA recente");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not apply a stale GitHub validation result after a newer validation takes ownership", async () => {
    const sha = "a".repeat(40);
    mocks.findUnique.mockResolvedValue({
      id: "candidate-1", createdById: "admin-user", commitSha: sha, version: "v1.0.0", target: "staging",
      status: "DRAFT", workflowRunId: 42n, artifactId: 77n, artifactDigest: null
    });
    mocks.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const body = url.endsWith("/actions/runs/42")
        ? { id: 42, head_sha: sha, head_branch: "main", event: "push", conclusion: "success", head_repository: { full_name: "juninnzx21/meujarvis" }, html_url: "https://github.com/run/42" }
        : url.endsWith("/actions/artifacts/77")
          ? { id: 77, name: "jarvis", digest: `sha256:${"a".repeat(64)}`, size_in_bytes: 1024, expired: false, workflow_run: { id: 42 } }
          : url.endsWith("/protection")
            ? { enforce_admins: { enabled: true }, required_status_checks: { contexts: ["validate", "desktop", "android"] } }
            : { check_runs: ["validate", "desktop", "android"].map((name) => ({ name, head_sha: sha, conclusion: "success" })) };
      return { ok: true, status: 200, json: async () => body };
    }));

    await request(testApp()).post("/releases/candidate-1/validate").set("x-test-role", "admin").expect(409);

    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
    expect(mocks.updateMany.mock.calls[1][0].where).toEqual(expect.objectContaining({ validationToken: expect.any(String) }));
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
