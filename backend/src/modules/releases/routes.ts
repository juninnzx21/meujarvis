import crypto from "node:crypto";
import { Router } from "express";
import { Prisma, ReleaseCandidateStatus } from "@prisma/client";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { canApproveRelease, inspectReleaseEvidence, sameReleaseArtifact, RELEASE_REPOSITORY } from "./githubEvidence.js";

const router = Router();
const maxPostgresBigInt = 9_223_372_036_854_775_807n;
const numericId = z.string().regex(/^[1-9]\d{0,18}$/).refine((value) => BigInt(value) <= maxPostgresBigInt);
const semverTag = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z.-]+)?$/;
const createSchema = z.object({
  commitSha: z.string().regex(/^[a-f0-9]{40}$/i).transform((value) => value.toLowerCase()),
  version: z.string().regex(semverTag).max(64),
  target: z.enum(["staging", "production"]),
  workflowRunId: numericId,
  artifactId: numericId
});
const approvalSchema = z.object({ reason: z.string().trim().min(8).max(1000) });

router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Somente administradores podem acessar aprovações de release" });
  return next();
});

function serializeCandidate<T extends Record<string, unknown>>(candidate: T) {
  const row = candidate as T & { workflowRunId: bigint; artifactId: bigint; artifactSize: bigint | null };
  return { ...candidate, workflowRunId: row.workflowRunId.toString(), artifactId: row.artifactId.toString(), artifactSize: row.artifactSize?.toString() ?? null };
}

function routeCandidateId(req: Parameters<typeof authMiddleware>[0]) {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

router.get("/", asyncHandler(async (_req, res) => {
  const candidates = await prisma.releaseCandidate.findMany({
    orderBy: { createdAt: "desc" }, take: 50,
    include: { createdBy: { select: { id: true, name: true, email: true } }, approval: true }
  });
  return res.json({ candidates: candidates.map(serializeCandidate), deployEnabled: false });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const id = routeCandidateId(req);
  if (!id) return res.status(404).json({ message: "Candidato de release nao encontrado" });
  const candidate = await prisma.releaseCandidate.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      approval: true,
      auditEvents: { orderBy: { createdAt: "asc" }, include: { actor: { select: { id: true, name: true, email: true } } } }
    }
  });
  if (!candidate) return res.status(404).json({ message: "Candidato de release nao encontrado" });
  return res.json({ candidate: serializeCandidate(candidate), deployEnabled: false });
}));

router.post("/candidates", validate(createSchema), asyncHandler(async (req, res) => {
  const input = req.body as z.infer<typeof createSchema>;
  const candidate = await prisma.$transaction(async (tx) => {
    const created = await tx.releaseCandidate.create({
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      data: {
        repository: RELEASE_REPOSITORY,
        commitSha: input.commitSha,
        sourceBranch: "pending-verification",
        version: input.version,
        target: input.target,
        workflowRunId: BigInt(input.workflowRunId),
        artifactId: BigInt(input.artifactId),
        createdById: req.user!.id,
        status: ReleaseCandidateStatus.DRAFT,
        blockedReasons: ["Aguardando validação de CI, branch e artefato no GitHub."]
      }
    });
    await tx.releaseAuditEvent.create({ data: {
      candidateId: created.id,
      actorUserId: req.user!.id,
      actorEmail: req.user!.email,
      eventType: "candidate_created",
      metadata: { commitSha: created.commitSha, version: created.version, target: created.target }
    } });
    return created;
  });
  return res.status(201).json({ candidate: serializeCandidate(candidate), deployEnabled: false });
}));

router.post("/:id/validate", asyncHandler(async (req, res) => {
  const id = routeCandidateId(req);
  if (!id) return res.status(404).json({ message: "Candidato de release nao encontrado" });
  const candidate = await prisma.releaseCandidate.findUnique({ where: { id } });
  if (!candidate) return res.status(404).json({ message: "Candidato de release nao encontrado" });
  if (candidate.status === ReleaseCandidateStatus.APPROVED || candidate.status === ReleaseCandidateStatus.DEPLOYED) {
    return res.status(409).json({ message: "Candidatos aprovados ou implantados sao imutaveis" });
  }
  const validationToken = crypto.randomUUID();
  const started = await prisma.$transaction(async (tx) => {
    const changed = await tx.releaseCandidate.updateMany({
      where: { id: candidate.id, status: { notIn: [ReleaseCandidateStatus.APPROVED, ReleaseCandidateStatus.DEPLOYED] } },
      data: { status: ReleaseCandidateStatus.TESTING, validationToken }
    });
    if (changed.count !== 1) return false;
    await tx.releaseAuditEvent.create({ data: {
      candidateId: candidate.id,
      actorUserId: req.user!.id,
      actorEmail: req.user!.email,
      eventType: "validation_started",
      metadata: { commitSha: candidate.commitSha, workflowRunId: candidate.workflowRunId.toString() }
    } });
    return true;
  });
  if (!started) return res.status(409).json({ message: "O candidato foi aprovado ou alterado; atualize a tela antes de validar" });

  let evidence;
  try {
    evidence = await inspectReleaseEvidence({ workflowRunId: candidate.workflowRunId, artifactId: candidate.artifactId, commitSha: candidate.commitSha });
  } catch {
    const blockedReasons = ["Não foi possível consultar a API pública do GitHub; tente validar novamente."];
    const update = await prisma.$transaction(async (tx) => {
      const changed = await tx.releaseCandidate.updateMany({
        where: { id: candidate.id, validationToken },
        data: { status: ReleaseCandidateStatus.TESTING, validationToken: null, blockedReasons }
      });
      if (changed.count !== 1) return null;
      const updated = await tx.releaseCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
      await tx.releaseAuditEvent.create({ data: {
        candidateId: candidate.id,
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        eventType: "validation_unavailable",
        metadata: { reason: "github_evidence_unavailable" }
      } });
      return updated;
    });
    if (!update) return res.status(409).json({ message: "Uma validação mais recente substituiu esta tentativa; atualize a tela" });
    return res.status(502).json({ candidate: serializeCandidate(update), deployEnabled: false, message: blockedReasons[0] });
  }

  const wrongBranch = evidence.sourceBranch !== "unknown" && evidence.sourceBranch !== "main";
  const status = evidence.expired ? ReleaseCandidateStatus.EXPIRED : wrongBranch ? ReleaseCandidateStatus.REJECTED : canApproveRelease(evidence.gates) ? ReleaseCandidateStatus.READY_FOR_APPROVAL : ReleaseCandidateStatus.TESTING;
  const blockedReasons = wrongBranch ? ["Somente commits originados de main podem se tornar candidatos de release.", ...evidence.blockedReasons] : evidence.blockedReasons;
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.releaseCandidate.updateMany({
      where: { id: candidate.id, validationToken, status: ReleaseCandidateStatus.TESTING },
      data: {
        sourceBranch: evidence.sourceBranch,
        artifactName: evidence.artifactName,
        artifactDigest: evidence.artifactDigest,
        artifactSize: evidence.artifactSize,
        ciRunUrl: evidence.ciRunUrl,
        gates: evidence.gates as Prisma.InputJsonValue,
        blockedReasons,
        status,
        validationToken: null
      }
    });
    if (changed.count !== 1) return null;
    const row = await tx.releaseCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
    await tx.releaseAuditEvent.create({ data: {
      candidateId: candidate.id,
      actorUserId: req.user!.id,
      actorEmail: req.user!.email,
      eventType: "validation_completed",
      metadata: {
        status,
        commitSha: candidate.commitSha,
        artifactDigest: evidence.artifactDigest,
        gates: evidence.gates as unknown as Prisma.InputJsonValue,
        blockedReasons
      }
    } });
    return row;
  });
  if (!updated) return res.status(409).json({ message: "Uma validação mais recente substituiu esta tentativa; nenhum resultado antigo foi aplicado" });
  return res.json({ candidate: serializeCandidate(updated), deployEnabled: false });
}));

async function verifiedStepUp(req: Parameters<typeof authMiddleware>[0]) {
  const token = req.header("x-jarvis-mfa-step-up");
  if (!token) return null;
  let claims: jwt.JwtPayload;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string") return null;
    claims = payload;
  } catch { return null; }
  if (claims.purpose !== "mfa_step_up" || claims.sub !== req.user?.id || typeof claims.ver !== "number" || typeof claims.jti !== "string") return null;
  const tokenHash = crypto.createHash("sha256").update(claims.jti).digest("hex");
  const [user, grant] = await Promise.all([
    prisma.user.findUnique({ where: { id: claims.sub }, select: { role: true, authVersion: true, totpEnabled: true } }),
    prisma.mfaStepUpGrant.findFirst({ where: { tokenHash, userId: claims.sub, authVersion: claims.ver, consumedAt: null, expiresAt: { gt: new Date() } } })
  ]);
  if (!user || user.role !== "admin" || !user.totpEnabled || user.authVersion !== claims.ver || !grant) return null;
  return { grantId: grant.id, authVersion: user.authVersion };
}

router.post("/:id/approve", validate(approvalSchema), asyncHandler(async (req, res) => {
  const id = routeCandidateId(req);
  if (!id) return res.status(404).json({ message: "Candidato de release nao encontrado" });
  const candidate = await prisma.releaseCandidate.findUnique({ where: { id }, include: { createdBy: { select: { id: true } } } });
  if (!candidate) return res.status(404).json({ message: "Candidato de release nao encontrado" });
  if (candidate.createdById === req.user!.id) return res.status(403).json({ message: "Quem solicitou a release nao pode aprova-la" });
  if (candidate.status !== ReleaseCandidateStatus.READY_FOR_APPROVAL || !candidate.artifactDigest || !canApproveRelease(candidate.gates)) {
    return res.status(409).json({ message: "Release bloqueada: todos os gates devem estar comprovados antes da aprovação", blockedReasons: candidate.blockedReasons });
  }
  const stepUp = await verifiedStepUp(req);
  if (!stepUp) return res.status(428).json({ message: "Faça uma verificação MFA recente para aprovar esta release" });

  let evidence;
  try {
    evidence = await inspectReleaseEvidence({ workflowRunId: candidate.workflowRunId, artifactId: candidate.artifactId, commitSha: candidate.commitSha });
  } catch {
    return res.status(502).json({ message: "Não foi possível revalidar a evidência do GitHub; aprovação bloqueada" });
  }
  if (evidence.expired || evidence.sourceBranch !== "main" || !sameReleaseArtifact(candidate, evidence) || !canApproveRelease(evidence.gates)) {
    const status = evidence.expired ? ReleaseCandidateStatus.EXPIRED : ReleaseCandidateStatus.TESTING;
    const reason = "SHA, digest, CI ou gates mudaram/não puderam ser confirmados; aprovação invalidada.";
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.releaseCandidate.updateMany({
        where: { id: candidate.id, status: ReleaseCandidateStatus.READY_FOR_APPROVAL, commitSha: candidate.commitSha, artifactDigest: candidate.artifactDigest },
        data: { status, gates: evidence.gates as Prisma.InputJsonValue, blockedReasons: [reason, ...evidence.blockedReasons] }
      });
      if (changed.count !== 1) return null;
      const row = await tx.releaseCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
      await tx.releaseAuditEvent.create({ data: {
        candidateId: candidate.id,
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        eventType: "approval_invalidated",
        metadata: { commitSha: candidate.commitSha, priorDigest: candidate.artifactDigest, currentDigest: evidence.artifactDigest }
      } });
      return row;
    });
    if (!updated) return res.status(409).json({ message: "O candidato foi alterado durante a revalidação; aprovação cancelada" });
    return res.status(409).json({ candidate: serializeCandidate(updated), message: reason, blockedReasons: updated.blockedReasons });
  }

  try {
    const approved = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const grant = await tx.mfaStepUpGrant.updateMany({ where: { id: stepUp.grantId, userId: req.user!.id, authVersion: stepUp.authVersion, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (grant.count !== 1) throw new Error("MFA_STEP_UP_ALREADY_USED");
      const candidateLock = await tx.releaseCandidate.updateMany({
        where: { id: candidate.id, status: ReleaseCandidateStatus.READY_FOR_APPROVAL, commitSha: candidate.commitSha, artifactDigest: candidate.artifactDigest },
        data: { status: ReleaseCandidateStatus.APPROVED }
      });
      if (candidateLock.count !== 1) throw new Error("RELEASE_CANDIDATE_CHANGED");
      await tx.releaseApproval.create({ data: {
        candidateId: candidate.id,
        approverId: req.user!.id,
        approverEmail: req.user!.email,
        reason: (req.body as z.infer<typeof approvalSchema>).reason,
        commitSha: candidate.commitSha,
        artifactDigest: candidate.artifactDigest!
      } });
      await tx.releaseAuditEvent.create({ data: {
        candidateId: candidate.id,
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        eventType: "approved",
        metadata: { commitSha: candidate.commitSha, artifactDigest: candidate.artifactDigest, target: candidate.target } as Prisma.InputJsonValue
      } });
      return tx.releaseCandidate.findUniqueOrThrow({ where: { id: candidate.id }, include: { approval: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.json({ candidate: serializeCandidate(approved), deployEnabled: false, message: "Aprovação registrada. Deploy permanece desabilitado." });
  } catch (error) {
    const message = error instanceof Error && error.message === "MFA_STEP_UP_ALREADY_USED" ? "Verificação MFA já utilizada; confirme novamente" : "Candidato ou aprovação mudou em paralelo; atualize a tela";
    return res.status(409).json({ message });
  }
}));

export default router;
