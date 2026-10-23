import { describe, expect, it } from "vitest";
import { getReleaseApprovalBlockers } from "./releaseApprovalPolicy.js";

const now = new Date("2026-10-23T12:00:00.000Z");
const candidate = {
  status: "READY_FOR_APPROVAL",
  target: "qa",
  sourceBranch: "qa-release-candidate",
  commitSha: "a".repeat(40),
  artifactDigest: `sha256:${"b".repeat(64)}`,
  ciConclusion: "success",
  sourceAuthorLogin: "author-gh",
  sourceVerifiedAt: new Date("2026-10-23T11:00:00.000Z"),
  branchProtectionVerifiedAt: new Date("2026-10-23T11:00:00.000Z"),
  checksVerifiedAt: new Date("2026-10-23T11:00:00.000Z"),
  stagingValidatedAt: null,
  backupRestoreVerifiedAt: null,
  rollbackVerifiedAt: null,
  healthChecksVerifiedAt: null,
  protectedEnvironmentVerifiedAt: null
};
const approval = {
  status: "PENDING",
  expiresAt: new Date("2026-10-23T12:30:00.000Z"),
  requestedByUserId: "requester"
};
const approver = {
  id: "reviewer",
  role: "admin",
  totpEnabled: true,
  githubLogin: "reviewer-gh",
  githubLinkedAt: new Date("2026-10-23T10:00:00.000Z")
};

describe("release approval policy", () => {
  it("allows only a distinct MFA admin after exact source and CI gates", () => {
    expect(getReleaseApprovalBlockers({ candidate, approval, approver, now })).toEqual([]);
  });

  it("blocks self approval by requester or verified source author", () => {
    expect(getReleaseApprovalBlockers({ candidate, approval: { ...approval, requestedByUserId: "reviewer" }, approver, now }))
      .toContain("requester_cannot_approve");
    expect(getReleaseApprovalBlockers({ candidate, approval, approver: { ...approver, githubLogin: "AUTHOR-GH" }, now }))
      .toContain("author_cannot_approve");
  });

  it("fails closed for unverified source, branch protection, checks, and expired approvals", () => {
    const blockers = getReleaseApprovalBlockers({
      candidate: { ...candidate, sourceVerifiedAt: null, sourceAuthorLogin: null, branchProtectionVerifiedAt: null, checksVerifiedAt: null },
      approval: { ...approval, expiresAt: now },
      approver: { ...approver, githubLogin: null, githubLinkedAt: null },
      now
    });
    expect(blockers).toEqual(expect.arrayContaining([
      "source_author_unverified",
      "protected_branch_unverified",
      "required_checks_unverified",
      "approval_expired",
      "approver_github_identity_unverified"
    ]));
  });

  it("rejects malformed SHA/digest and non-success CI", () => {
    const blockers = getReleaseApprovalBlockers({
      candidate: { ...candidate, commitSha: "deadbeef", artifactDigest: "sha256:bad", ciConclusion: "failure" },
      approval,
      approver,
      now
    });
    expect(blockers).toEqual(expect.arrayContaining(["invalid_commit_sha", "invalid_artifact_digest", "ci_not_successful"]));
  });

  it("requires staging, backup, rollback, health, and protected-environment evidence for production", () => {
    const blockers = getReleaseApprovalBlockers({ candidate: { ...candidate, target: "production" }, approval, approver, now });
    expect(blockers).toEqual(expect.arrayContaining([
      "staging_not_validated",
      "backup_restore_not_verified",
      "rollback_not_verified",
      "health_checks_not_verified",
      "protected_environment_unverified"
    ]));
  });
});
