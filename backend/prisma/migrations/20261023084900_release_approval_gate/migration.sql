CREATE TYPE "ReleaseTarget" AS ENUM ('qa', 'production');
CREATE TYPE "ReleaseCandidateStatus" AS ENUM ('DRAFT', 'TESTING', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'DEPLOYED');
CREATE TYPE "ReleaseApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVALIDATED');

ALTER TABLE "User"
  ADD COLUMN "githubLogin" TEXT,
  ADD COLUMN "githubLinkedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_githubLogin_key" ON "User"("githubLogin");

CREATE TABLE "ReleaseCandidate" (
  "id" TEXT NOT NULL,
  "repository" TEXT NOT NULL,
  "commitSha" TEXT NOT NULL,
  "sourceBranch" TEXT NOT NULL,
  "target" "ReleaseTarget" NOT NULL,
  "workflowRunId" TEXT NOT NULL,
  "workflowRunUrl" TEXT,
  "artifactId" TEXT NOT NULL,
  "artifactName" TEXT NOT NULL,
  "artifactDigest" TEXT NOT NULL,
  "artifactSize" BIGINT NOT NULL,
  "ciConclusion" TEXT NOT NULL,
  "sourceAuthorLogin" TEXT,
  "sourceVerifiedAt" TIMESTAMP(3),
  "branchProtectionVerifiedAt" TIMESTAMP(3),
  "checksVerifiedAt" TIMESTAMP(3),
  "stagingValidatedAt" TIMESTAMP(3),
  "backupRestoreVerifiedAt" TIMESTAMP(3),
  "rollbackVerifiedAt" TIMESTAMP(3),
  "healthChecksVerifiedAt" TIMESTAMP(3),
  "protectedEnvironmentVerifiedAt" TIMESTAMP(3),
  "status" "ReleaseCandidateStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReleaseCandidate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReleaseCandidate_repository_commitSha_target_artifactId_key"
  ON "ReleaseCandidate"("repository", "commitSha", "target", "artifactId");
CREATE INDEX "ReleaseCandidate_target_status_createdAt_idx"
  ON "ReleaseCandidate"("target", "status", "createdAt");
CREATE INDEX "ReleaseCandidate_commitSha_idx" ON "ReleaseCandidate"("commitSha");
ALTER TABLE "ReleaseCandidate" ADD CONSTRAINT "ReleaseCandidate_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReleaseApproval" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "status" "ReleaseApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "approvedAuthVersion" INTEGER,
  "consumedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "totpCounter" BIGINT,
  CONSTRAINT "ReleaseApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReleaseApproval_candidateId_status_expiresAt_idx"
  ON "ReleaseApproval"("candidateId", "status", "expiresAt");
CREATE INDEX "ReleaseApproval_requestedByUserId_requestedAt_idx"
  ON "ReleaseApproval"("requestedByUserId", "requestedAt");
CREATE UNIQUE INDEX "ReleaseApproval_idempotencyKey_key" ON "ReleaseApproval"("idempotencyKey");
ALTER TABLE "ReleaseApproval" ADD CONSTRAINT "ReleaseApproval_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "ReleaseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReleaseApproval" ADD CONSTRAINT "ReleaseApproval_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReleaseApproval" ADD CONSTRAINT "ReleaseApproval_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReleaseAuditEvent" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "approvalId" TEXT,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "metadataRedacted" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReleaseAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReleaseAuditEvent_candidateId_createdAt_idx"
  ON "ReleaseAuditEvent"("candidateId", "createdAt");
CREATE INDEX "ReleaseAuditEvent_approvalId_createdAt_idx"
  ON "ReleaseAuditEvent"("approvalId", "createdAt");
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "ReleaseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_approvalId_fkey"
  FOREIGN KEY ("approvalId") REFERENCES "ReleaseApproval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
