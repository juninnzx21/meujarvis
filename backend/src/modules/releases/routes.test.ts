import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    releaseCandidate: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    releaseApproval: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    releaseAuditEvent: { create: vi.fn() }
  };
  return { tx, prisma: { $transaction: vi.fn() } };
});

vi.mock("../../middlewares/auth.js", () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: "admin-1", email: "admin@example.test", name: "Admin", role: (req.header("x-test-role") ?? "admin") as never };
    next();
  }
}));
vi.mock("../../prisma/client.js", () => ({ prisma: mocks.prisma }));

import releaseRoutes from "./routes.js";

function makeApp() {
  return express().use(express.json()).use("/releases", releaseRoutes);
}

describe("release approval API security gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx));
  });

  it("rejects non-admin access before reading candidates", async () => {
    await request(makeApp()).get("/releases/candidates").set("x-test-role", "user").expect(403);
    expect(mocks.tx.releaseCandidate.findUnique).not.toHaveBeenCalled();
  });

  it("stores untrusted browser metadata only as a draft after MFA", async () => {
    mocks.tx.user.findUnique.mockResolvedValue(null);
    await request(makeApp()).post("/releases/candidates").send({
      repository: "juninnzx21/meujarvis",
      commitSha: "a".repeat(40),
      sourceBranch: "main",
      target: "production",
      workflowRunId: "123",
      artifactId: "456",
      artifactName: "jarvis.zip",
      artifactDigest: `sha256:${"b".repeat(64)}`,
      artifactSize: 10,
      totpCode: "123456"
    }).expect(403);
    expect(mocks.tx.releaseCandidate.create).not.toHaveBeenCalled();
  });

  it("blocks approval requests when provenance and branch protection are unverified", async () => {
    mocks.tx.releaseCandidate.findUnique.mockResolvedValue({
      id: "candidate-1",
      status: "DRAFT",
      target: "production",
      sourceBranch: "main",
      commitSha: "a".repeat(40),
      artifactDigest: `sha256:${"b".repeat(64)}`,
      ciConclusion: "unverified",
      sourceAuthorLogin: null,
      sourceVerifiedAt: null,
      branchProtectionVerifiedAt: null,
      checksVerifiedAt: null,
      stagingValidatedAt: null,
      backupRestoreVerifiedAt: null,
      rollbackVerifiedAt: null,
      healthChecksVerifiedAt: null,
      protectedEnvironmentVerifiedAt: null
    });

    const response = await request(makeApp()).post("/releases/candidates/candidate-1/request-approval").send({ idempotencyKey: "9d35e247-6aca-4d01-9d61-80d07aaf0d4a", totpCode: "123456" }).expect(409);

    expect(response.body.blockers).toEqual(expect.arrayContaining([
      "candidate_not_ready",
      "source_author_unverified",
      "protected_branch_unverified",
      "required_checks_unverified",
      "staging_not_validated",
      "backup_restore_not_verified",
      "rollback_not_verified",
      "health_checks_not_verified",
      "protected_environment_unverified"
    ]));
    expect(mocks.tx.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.tx.releaseApproval.create).not.toHaveBeenCalled();
  });

  it("returns the original approval for a repeated idempotency key without consuming MFA again", async () => {
    const existing = { id: "approval-1", candidateId: "candidate-1", requestedByUserId: "admin-1", status: "PENDING" };
    mocks.tx.releaseApproval.findUnique.mockResolvedValue(existing);

    const response = await request(makeApp()).post("/releases/candidates/candidate-1/request-approval").send({
      idempotencyKey: "9d35e247-6aca-4d01-9d61-80d07aaf0d4a",
      totpCode: "123456"
    }).expect(200);

    expect(response.body).toMatchObject({ approval: existing, replayed: true });
    expect(mocks.tx.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.tx.releaseApproval.create).not.toHaveBeenCalled();
  });

  it("blocks approval consumption when the candidate author is not verified", async () => {
    mocks.tx.releaseApproval.findUnique.mockResolvedValue({
      id: "approval-1",
      status: "PENDING",
      candidateId: "candidate-1",
      requestedByUserId: "requester-1",
      expiresAt: new Date(Date.now() + 30 * 60_000),
      consumedAt: null
    });
    mocks.tx.releaseCandidate.findUnique.mockResolvedValue({
      id: "candidate-1",
      status: "READY_FOR_APPROVAL",
      target: "qa",
      sourceBranch: "qa",
      commitSha: "a".repeat(40),
      artifactDigest: `sha256:${"b".repeat(64)}`,
      ciConclusion: "success",
      sourceAuthorLogin: null,
      sourceVerifiedAt: null,
      branchProtectionVerifiedAt: new Date(),
      checksVerifiedAt: new Date(),
      stagingValidatedAt: null,
      backupRestoreVerifiedAt: null,
      rollbackVerifiedAt: null,
      healthChecksVerifiedAt: null,
      protectedEnvironmentVerifiedAt: null
    });

    const response = await request(makeApp()).post("/releases/approvals/approval-1/approve").send({
      commitSha: "a".repeat(40),
      artifactDigest: `sha256:${"b".repeat(64)}`,
      totpCode: "123456"
    }).expect(409);

    expect(response.body.blockers).toContain("source_author_unverified");
    expect(mocks.tx.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.tx.releaseApproval.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.releaseCandidate.updateMany).not.toHaveBeenCalled();
  });
});
