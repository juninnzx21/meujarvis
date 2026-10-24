import { z } from "zod";

const date = z.string().datetime({ offset: true });
const candidateSchema = z.object({
  id: z.string(), commitSha: z.string(), sourceBranch: z.string(),
  target: z.string(), status: z.string(), artifactName: z.string(),
  artifactDigest: z.string(), workflowRunId: z.string(), ciConclusion: z.string(),
  sourceVerifiedAt: date.nullable(), checksVerifiedAt: date.nullable(),
  stagingValidatedAt: date.nullable(), rollbackVerifiedAt: date.nullable(),
  approvalRequests: z.array(z.object({
    id: z.string(), status: z.string(), expiresAt: date, decisionReason: z.string().nullable()
  })),
  auditEvents: z.array(z.object({ id: z.string(), eventType: z.string(), createdAt: date }))
});

export type ReleaseCandidate = z.infer<typeof candidateSchema>;

// Strip extra fields, including arbitrary audit metadata and untrusted URLs.
// This read-only projection never grants approval.
export function parseCandidates(data: unknown): ReleaseCandidate[] {
  return z.object({ candidates: z.array(candidateSchema).max(100) }).parse(data).candidates;
}
