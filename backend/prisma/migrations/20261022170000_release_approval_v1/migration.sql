CREATE TYPE "ReleaseCandidateStatus" AS ENUM (
  'DRAFT',
  'TESTING',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'DEPLOYED'
);

CREATE TABLE "ReleaseCandidate" (
  "id" TEXT NOT NULL,
  "repository" TEXT NOT NULL,
  "commitSha" VARCHAR(40) NOT NULL,
  "sourceBranch" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "workflowRunId" BIGINT NOT NULL,
  "artifactId" BIGINT NOT NULL,
  "artifactName" TEXT,
  "artifactDigest" TEXT,
  "artifactSize" BIGINT,
  "ciRunUrl" TEXT,
  "gates" JSONB,
  "validationToken" TEXT,
  "blockedReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ReleaseCandidateStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReleaseCandidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReleaseCandidate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ReleaseApproval" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "approverId" TEXT,
  "approverEmail" TEXT NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "commitSha" VARCHAR(40) NOT NULL,
  "artifactDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReleaseApproval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReleaseApproval_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ReleaseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReleaseApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ReleaseAuditEvent" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReleaseAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReleaseAuditEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ReleaseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReleaseAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MfaStepUpGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaStepUpGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaStepUpGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReleaseCandidate_repository_commitSha_target_artifactId_key" ON "ReleaseCandidate"("repository", "commitSha", "target", "artifactId");
CREATE INDEX "ReleaseCandidate_status_createdAt_idx" ON "ReleaseCandidate"("status", "createdAt");
CREATE INDEX "ReleaseCandidate_createdById_createdAt_idx" ON "ReleaseCandidate"("createdById", "createdAt");
CREATE UNIQUE INDEX "ReleaseCandidate_validationToken_key" ON "ReleaseCandidate"("validationToken");
CREATE UNIQUE INDEX "ReleaseApproval_candidateId_key" ON "ReleaseApproval"("candidateId");
CREATE INDEX "ReleaseAuditEvent_candidateId_createdAt_idx" ON "ReleaseAuditEvent"("candidateId", "createdAt");
CREATE INDEX "ReleaseAuditEvent_actorUserId_createdAt_idx" ON "ReleaseAuditEvent"("actorUserId", "createdAt");
CREATE UNIQUE INDEX "MfaStepUpGrant_tokenHash_key" ON "MfaStepUpGrant"("tokenHash");
CREATE INDEX "MfaStepUpGrant_userId_expiresAt_idx" ON "MfaStepUpGrant"("userId", "expiresAt");
