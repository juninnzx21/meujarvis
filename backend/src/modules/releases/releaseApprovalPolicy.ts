export type ReleasePolicyCandidate = {
  status: string;
  target: string;
  sourceBranch: string;
  commitSha: string;
  artifactDigest: string;
  ciConclusion: string;
  sourceAuthorLogin: string | null;
  sourceVerifiedAt: Date | null;
  branchProtectionVerifiedAt: Date | null;
  checksVerifiedAt: Date | null;
  stagingValidatedAt: Date | null;
  backupRestoreVerifiedAt: Date | null;
  rollbackVerifiedAt: Date | null;
  healthChecksVerifiedAt: Date | null;
  protectedEnvironmentVerifiedAt: Date | null;
};

export type ReleasePolicyApproval = {
  status: string;
  expiresAt: Date;
  requestedByUserId: string;
};

export type ReleasePolicyApprover = {
  id: string;
  role: string;
  totpEnabled: boolean;
  githubLogin: string | null;
  githubLinkedAt: Date | null;
};

export function getReleaseApprovalBlockers(input: {
  candidate: ReleasePolicyCandidate;
  approval: ReleasePolicyApproval;
  approver: ReleasePolicyApprover;
  now?: Date;
}): string[] {
  const { candidate, approval, approver } = input;
  const now = input.now ?? new Date();
  const blockers: string[] = [];

  if (candidate.status !== "READY_FOR_APPROVAL") blockers.push("candidate_not_ready");
  if (!/^([a-f0-9]{40}|[a-f0-9]{64})$/i.test(candidate.commitSha)) blockers.push("invalid_commit_sha");
  if (!/^sha256:[a-f0-9]{64}$/i.test(candidate.artifactDigest)) blockers.push("invalid_artifact_digest");
  if (candidate.ciConclusion.toLowerCase() !== "success") blockers.push("ci_not_successful");
  if (!candidate.sourceVerifiedAt || !candidate.sourceAuthorLogin) blockers.push("source_author_unverified");
  if (!candidate.branchProtectionVerifiedAt) blockers.push("protected_branch_unverified");
  if (!candidate.checksVerifiedAt) blockers.push("required_checks_unverified");
  if (approval.status !== "PENDING") blockers.push("approval_not_pending");
  if (approval.expiresAt.getTime() <= now.getTime()) blockers.push("approval_expired");
  if (approver.role !== "admin") blockers.push("admin_required");
  if (!approver.totpEnabled) blockers.push("mfa_required");
  if (!approver.githubLogin || !approver.githubLinkedAt) blockers.push("approver_github_identity_unverified");
  if (approval.requestedByUserId === approver.id) blockers.push("requester_cannot_approve");
  if (candidate.sourceAuthorLogin && approver.githubLogin?.toLowerCase() === candidate.sourceAuthorLogin.toLowerCase()) {
    blockers.push("author_cannot_approve");
  }
  if (candidate.target !== "qa" && candidate.target !== "production") blockers.push("invalid_target");
  if (candidate.target === "production") {
    if (candidate.sourceBranch !== "main") blockers.push("production_source_branch_not_main");
    if (!candidate.stagingValidatedAt) blockers.push("staging_not_validated");
    if (!candidate.backupRestoreVerifiedAt) blockers.push("backup_restore_not_verified");
    if (!candidate.rollbackVerifiedAt) blockers.push("rollback_not_verified");
    if (!candidate.healthChecksVerifiedAt) blockers.push("health_checks_not_verified");
    if (!candidate.protectedEnvironmentVerifiedAt) blockers.push("protected_environment_unverified");
  }

  return blockers;
}
