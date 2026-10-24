import { Prisma, type PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { decryptTotpSecret } from "../../services/totpSecretService.js";
import { matchTotpCounter } from "../../services/totpService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { redactSensitive } from "../../utils/redact.js";
import { getReleaseApprovalBlockers } from "./releaseApprovalPolicy.js";

const router = Router();
router.use(authMiddleware);
router.use((_req, res, next) => {
  res.set({ "Cache-Control": "no-store", Pragma: "no-cache" });
  next();
});

const candidateSchema = z.object({
  repository: z.literal("juninnzx21/meujarvis"),
  commitSha: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i),
  sourceBranch: z.string().min(1).max(255),
  target: z.enum(["qa", "production"]),
  workflowRunId: z.string().regex(/^\d{1,24}$/),
  artifactId: z.string().regex(/^\d{1,24}$/),
  artifactName: z.string().min(1).max(255),
  artifactDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
  artifactSize: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  totpCode: z.string().trim().length(6)
});
const reasonSchema = z.object({ reason: z.string().trim().min(5).max(1000), totpCode: z.string().trim().length(6) });
const requestApprovalSchema = z.object({ idempotencyKey: z.string().uuid(), totpCode: z.string().trim().length(6) });
const approveSchema = z.object({
  commitSha: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i),
  artifactDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
  totpCode: z.string().trim().length(6)
});

type TransactionClient = Prisma.TransactionClient;
type DbClient = PrismaClient | TransactionClient;

function isAdmin(req: Parameters<typeof authMiddleware>[0], res: Parameters<typeof authMiddleware>[1]) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Apenas administradores podem acessar a central de releases." });
    return false;
  }
  return true;
}

function routeParam(req: Parameters<typeof authMiddleware>[0], key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function consumeAdminTotp(tx: DbClient, userId: string, code: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, totpEnabled: true, totpSecretEncrypted: true, totpLastCounter: true, authVersion: true }
  });
  if (!user || user.role !== "admin" || !user.totpEnabled || !user.totpSecretEncrypted) return null;
  let counter: bigint | null = null;
  try {
    counter = matchTotpCounter(decryptTotpSecret(user.totpSecretEncrypted), code);
  } catch {
    return null;
  }
  if (counter === null || (user.totpLastCounter !== null && counter <= user.totpLastCounter)) return null;

  const consumed = await tx.user.updateMany({
    where: {
      id: user.id,
      role: "admin",
      totpEnabled: true,
      authVersion: user.authVersion,
      totpLastCounter: user.totpLastCounter
    },
    data: { totpLastCounter: counter }
  });
  return consumed.count === 1 ? { authVersion: user.authVersion, counter } : null;
}

router.get("/candidates", asyncHandler(async (req, res) => {
  if (!isAdmin(req, res)) return;
  const candidates = await prisma.releaseCandidate.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      repository: true,
      commitSha: true,
      sourceBranch: true,
      target: true,
      workflowRunId: true,
      workflowRunUrl: true,
      artifactId: true,
      artifactName: true,
      artifactDigest: true,
      artifactSize: true,
      ciConclusion: true,
      sourceAuthorLogin: true,
      sourceVerifiedAt: true,
      branchProtectionVerifiedAt: true,
      checksVerifiedAt: true,
      stagingValidatedAt: true,
      backupRestoreVerifiedAt: true,
      rollbackVerifiedAt: true,
      healthChecksVerifiedAt: true,
      protectedEnvironmentVerifiedAt: true,
      status: true,
      createdAt: true,
      approvalRequests: {
        orderBy: { requestedAt: "desc" },
        take: 10,
        select: { id: true, status: true, requestedAt: true, expiresAt: true, approvedAt: true, decisionReason: true }
      },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, eventType: true, metadataRedacted: true, createdAt: true } }
    }
  });
  return res.json({ candidates: candidates.map(({ artifactSize, ...item }) => ({ ...item, artifactSize: artifactSize.toString() })) });
}));

// Browser-supplied metadata is always stored as an unverified draft. Only a future
// trusted GitHub provenance adapter may attest source, branch protection and checks.
router.post("/candidates", validate(candidateSchema), asyncHandler(async (req, res) => {
  if (!isAdmin(req, res) || !req.user) return;
  try {
    const candidate = await prisma.$transaction(async (tx) => {
      const mfa = await consumeAdminTotp(tx, req.user!.id, req.body.totpCode);
      if (!mfa) throw new Error("MFA_INVALID");
      const created = await tx.releaseCandidate.create({
        data: {
          repository: req.body.repository,
          commitSha: req.body.commitSha.toLowerCase(),
          sourceBranch: req.body.sourceBranch,
          target: req.body.target,
          workflowRunId: req.body.workflowRunId,
          workflowRunUrl: `https://github.com/juninnzx21/meujarvis/actions/runs/${req.body.workflowRunId}`,
          artifactId: req.body.artifactId,
          artifactName: req.body.artifactName,
          artifactDigest: req.body.artifactDigest.toLowerCase(),
          artifactSize: BigInt(req.body.artifactSize),
          ciConclusion: "unverified",
          status: "DRAFT",
          createdByUserId: req.user!.id
        }
      });
      await tx.releaseAuditEvent.create({
        data: {
          candidateId: created.id,
          actorUserId: req.user!.id,
          eventType: "candidate_draft_created",
          metadataRedacted: { target: created.target, commitSha: created.commitSha, artifactDigest: created.artifactDigest }
        }
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.status(201).json({ candidate: { ...candidate, artifactSize: candidate.artifactSize.toString() }, sourceVerified: false, approvalAllowed: false });
  } catch (error) {
    if (error instanceof Error && error.message === "MFA_INVALID") return res.status(403).json({ message: "MFA administrativa válida é obrigatória." });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return res.status(409).json({ message: "Este artefato já foi registrado para o SHA e target informados." });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return res.status(409).json({ message: "Conflito concorrente; atualize a lista e tente novamente." });
    throw error;
  }
}));

router.post("/candidates/:candidateId/request-approval", validate(requestApprovalSchema), asyncHandler(async (req, res) => {
  if (!isAdmin(req, res) || !req.user) return;
  try {
    const request = await prisma.$transaction(async (tx) => {
      const priorRequest = await tx.releaseApproval.findUnique({ where: { idempotencyKey: req.body.idempotencyKey } });
      if (priorRequest) {
        if (priorRequest.candidateId !== routeParam(req, "candidateId") || priorRequest.requestedByUserId !== req.user!.id) throw new Error("IDEMPOTENCY_CONFLICT");
        return { approval: priorRequest, replay: true };
      }
      const candidate = await tx.releaseCandidate.findUnique({ where: { id: routeParam(req, "candidateId") } });
      if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
      const blockers = getReleaseApprovalBlockers({
        candidate,
        approval: { status: "PENDING", expiresAt: new Date(Date.now() + 30 * 60_000), requestedByUserId: "requester-preflight" },
        approver: { id: "approver-preflight", role: "admin", totpEnabled: true, githubLogin: "reviewer-preflight", githubLinkedAt: new Date() }
      }).filter((item) => item !== "requester_cannot_approve" && item !== "author_cannot_approve");
      if (blockers.length) throw new Error(`CANDIDATE_BLOCKED:${blockers.join(",")}`);
      const existingPending = await tx.releaseApproval.findFirst({ where: { candidateId: candidate.id, status: "PENDING", expiresAt: { gt: new Date() } } });
      if (existingPending) throw new Error("PENDING_APPROVAL");
      const mfa = await consumeAdminTotp(tx, req.user!.id, req.body.totpCode);
      if (!mfa) throw new Error("MFA_INVALID");
      const approval = await tx.releaseApproval.create({ data: { idempotencyKey: req.body.idempotencyKey, candidateId: candidate.id, requestedByUserId: req.user!.id, expiresAt: new Date(Date.now() + 30 * 60_000) } });
      await tx.releaseAuditEvent.create({
        data: { candidateId: candidate.id, approvalId: approval.id, actorUserId: req.user!.id, eventType: "approval_requested", metadataRedacted: { expiresAt: approval.expiresAt.toISOString() } }
      });
      return { approval, replay: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.status(request.replay ? 200 : 201).json({ approval: request.approval, replayed: request.replay });
  } catch (error) {
    if (error instanceof Error && error.message === "CANDIDATE_NOT_FOUND") return res.status(404).json({ message: "Candidato não encontrado." });
    if (error instanceof Error && error.message === "PENDING_APPROVAL") return res.status(409).json({ message: "Já existe uma aprovação válida para este candidato." });
    if (error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT") return res.status(409).json({ message: "Esta chave de idempotência já pertence a outra solicitação." });
    if (error instanceof Error && error.message === "MFA_INVALID") return res.status(403).json({ message: "MFA administrativa válida é obrigatória." });
    if (error instanceof Error && error.message.startsWith("CANDIDATE_BLOCKED:")) return res.status(409).json({ message: "Candidato bloqueado até cumprir os gates de origem, segurança e CI.", blockers: error.message.slice("CANDIDATE_BLOCKED:".length).split(",") });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return res.status(409).json({ message: "Conflito concorrente; atualize a lista." });
    throw error;
  }
}));

router.post("/approvals/:approvalId/approve", validate(approveSchema), asyncHandler(async (req, res) => {
  if (!isAdmin(req, res) || !req.user) return;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const approval = await tx.releaseApproval.findUnique({ where: { id: routeParam(req, "approvalId") } });
      if (!approval) throw new Error("APPROVAL_NOT_FOUND");
      const candidate = await tx.releaseCandidate.findUnique({ where: { id: approval.candidateId } });
      if (!candidate) throw new Error("APPROVAL_NOT_FOUND");
      const expected = getReleaseApprovalBlockers({
        candidate,
        approval,
        approver: { id: req.user!.id, role: req.user!.role, totpEnabled: true, githubLogin: "preflight", githubLinkedAt: new Date() }
      });
      const blockers = expected.filter((item) => !["approver_github_identity_unverified", "author_cannot_approve"].includes(item));
      if (candidate.commitSha.toLowerCase() !== req.body.commitSha.toLowerCase() || candidate.artifactDigest.toLowerCase() !== req.body.artifactDigest.toLowerCase()) blockers.push("artifact_identity_mismatch");
      if (candidate.sourceAuthorLogin) {
        const user = await tx.user.findUnique({ where: { id: req.user!.id }, select: { githubLogin: true, githubLinkedAt: true } });
        if (!user?.githubLogin || !user.githubLinkedAt) blockers.push("approver_github_identity_unverified");
        else if (user.githubLogin.toLowerCase() === candidate.sourceAuthorLogin.toLowerCase()) blockers.push("author_cannot_approve");
      } else blockers.push("source_author_unverified");
      if (approval.requestedByUserId === req.user!.id) blockers.push("requester_cannot_approve");
      if (blockers.length) throw new Error(`APPROVAL_BLOCKED:${[...new Set(blockers)].join(",")}`);

      const mfa = await consumeAdminTotp(tx, req.user!.id, req.body.totpCode);
      if (!mfa) throw new Error("MFA_INVALID");
      const now = new Date();
      const changed = await tx.releaseApproval.updateMany({
        where: { id: approval.id, status: "PENDING", expiresAt: { gt: now }, consumedAt: null },
        data: { status: "APPROVED", approvedByUserId: req.user!.id, approvedAt: now, consumedAt: now, approvedAuthVersion: mfa.authVersion, totpCounter: mfa.counter }
      });
      if (changed.count !== 1) throw new Error("APPROVAL_ALREADY_CONSUMED");
      const candidateChanged = await tx.releaseCandidate.updateMany({ where: { id: approval.candidateId, status: "READY_FOR_APPROVAL", commitSha: candidate.commitSha, artifactDigest: candidate.artifactDigest }, data: { status: "APPROVED" } });
      if (candidateChanged.count !== 1) throw new Error("CANDIDATE_CHANGED");
      await tx.releaseAuditEvent.create({
        data: { candidateId: approval.candidateId, approvalId: approval.id, actorUserId: req.user!.id, eventType: "approval_granted", metadataRedacted: { commitSha: candidate.commitSha, artifactDigest: candidate.artifactDigest, target: candidate.target, approvedAt: now.toISOString() } }
      });
      return { id: approval.id, status: "APPROVED", approvedAt: now };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.json({ approval: result, deploymentStarted: false });
  } catch (error) {
    if (error instanceof Error && error.message === "APPROVAL_NOT_FOUND") return res.status(404).json({ message: "Solicitação não encontrada." });
    if (error instanceof Error && error.message === "MFA_INVALID") return res.status(403).json({ message: "MFA administrativa válida é obrigatória." });
    if (error instanceof Error && error.message === "APPROVAL_ALREADY_CONSUMED") return res.status(409).json({ message: "A aprovação expirou ou já foi consumida." });
    if (error instanceof Error && error.message === "CANDIDATE_CHANGED") return res.status(409).json({ message: "A identidade do artefato mudou; aprovação recusada." });
    if (error instanceof Error && error.message.startsWith("APPROVAL_BLOCKED:")) return res.status(409).json({ message: "A aprovação está bloqueada pelos gates de segurança.", blockers: error.message.slice("APPROVAL_BLOCKED:".length).split(",") });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return res.status(409).json({ message: "Conflito concorrente; a aprovação não foi consumida." });
    throw error;
  }
}));

router.post("/approvals/:approvalId/reject", validate(reasonSchema), asyncHandler(async (req, res) => {
  if (!isAdmin(req, res) || !req.user) return;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const approval = await tx.releaseApproval.findUnique({ where: { id: routeParam(req, "approvalId") } });
      if (!approval) throw new Error("APPROVAL_NOT_FOUND");
      const candidate = await tx.releaseCandidate.findUnique({ where: { id: approval.candidateId } });
      if (!candidate) throw new Error("APPROVAL_NOT_FOUND");
      const mfa = await consumeAdminTotp(tx, req.user!.id, req.body.totpCode);
      if (!mfa) throw new Error("MFA_INVALID");
      const now = new Date();
      const safeReason = String(redactSensitive(String(req.body.reason))).slice(0, 1000);
      const changed = await tx.releaseApproval.updateMany({ where: { id: approval.id, status: "PENDING", expiresAt: { gt: now }, consumedAt: null }, data: { status: "REJECTED", approvedByUserId: req.user!.id, approvedAt: now, consumedAt: now, approvedAuthVersion: mfa.authVersion, totpCounter: mfa.counter, decisionReason: safeReason } });
      if (changed.count !== 1) throw new Error("APPROVAL_ALREADY_CONSUMED");
      await tx.releaseCandidate.updateMany({ where: { id: approval.candidateId, status: "READY_FOR_APPROVAL" }, data: { status: "REJECTED" } });
      await tx.releaseAuditEvent.create({ data: { candidateId: approval.candidateId, approvalId: approval.id, actorUserId: req.user!.id, eventType: "approval_rejected", metadataRedacted: { reason: safeReason, rejectedAt: now.toISOString() } } });
      return { id: approval.id, status: "REJECTED", rejectedAt: now };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.json({ approval: result, deploymentStarted: false });
  } catch (error) {
    if (error instanceof Error && error.message === "APPROVAL_NOT_FOUND") return res.status(404).json({ message: "Solicitação não encontrada." });
    if (error instanceof Error && error.message === "MFA_INVALID") return res.status(403).json({ message: "MFA administrativa válida é obrigatória." });
    if (error instanceof Error && error.message === "APPROVAL_ALREADY_CONSUMED") return res.status(409).json({ message: "A aprovação expirou ou já foi consumida." });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return res.status(409).json({ message: "Conflito concorrente; a decisão não foi aplicada." });
    throw error;
  }
}));

export default router;
