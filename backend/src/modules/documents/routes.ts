import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { emitJarvisEvent } from "../../services/eventBusService.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { redactSensitive } from "../../utils/redact.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const storageDir = path.resolve(process.cwd(), "storage", "documents");
const allowedTypes = new Set(["txt", "md", "csv", "pdf", "ofx"]);

function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function chunkText(content: string) {
  const chunks: string[] = [];
  for (let index = 0; index < content.length; index += 1800) {
    chunks.push(content.slice(index, index + 1800));
  }
  return chunks.length ? chunks : [content];
}

const uploadSchema = z.object({
  title: z.string().min(2),
  fileName: z.string().min(2),
  fileType: z.string().min(2),
  content: z.string().max(250_000).optional(),
  source: z.enum(["upload", "whatsapp", "manual"]).default("manual")
});

router.post("/upload", validate(uploadSchema), asyncHandler(async (req, res) => {
  const fileType = req.body.fileType.toLowerCase().replace(/^\./, "");
  if (!allowedTypes.has(fileType)) {
    return res.status(400).json({ message: "Tipo de documento nao suportado nesta fase." });
  }

  const safeFileName = sanitizeFileName(req.body.fileName);
  await mkdir(storageDir, { recursive: true });
  if (req.body.content) {
    await writeFile(path.join(storageDir, `${Date.now()}-${safeFileName}`), req.body.content, "utf8");
  }

  const document = await prisma.document.create({
    data: {
      userId: req.user!.id,
      title: req.body.title,
      fileName: safeFileName,
      fileType,
      source: req.body.source,
      status: req.body.content ? "indexed" : "uploaded",
      summary: req.body.content ? String(redactSensitive(req.body.content.slice(0, 500))) : undefined,
      metadata: { contentLength: req.body.content?.length ?? 0 }
    }
  });

  if (req.body.content) {
    await prisma.documentChunk.createMany({
      data: chunkText(req.body.content).map((content, chunkIndex) => ({
        documentId: document.id,
        chunkIndex,
        content,
        contentRedacted: String(redactSensitive(content)),
        metadata: { length: content.length }
      }))
    });
  }

  await writeSystemLog({ userId: req.user!.id, module: "documents", action: "upload", message: "Documento registrado com seguranca", metadata: { documentId: document.id, fileType, source: req.body.source } });
  await emitJarvisEvent({ userId: req.user!.id, type: "system.alert", payload: { documentId: document.id, fileType, source: req.body.source }, target: "internal" });
  res.status(201).json({ document });
}));

router.get("/", asyncHandler(async (req, res) => {
  const documents = await prisma.document.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json({ documents });
}));

router.get("/search", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ chunks: [] });
  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: { userId: req.user!.id },
      OR: [{ contentRedacted: { contains: q, mode: "insensitive" } }, { document: { title: { contains: q, mode: "insensitive" } } }]
    },
    include: { document: true },
    take: 25
  });
  res.json({ chunks: chunks.map((chunk) => ({ ...chunk, content: chunk.contentRedacted })) });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!document) return res.status(404).json({ message: "Documento nao encontrado." });
  res.json({ document });
}));

router.get("/:id/chunks", asyncHandler(async (req, res) => {
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId: String(req.params.id), document: { userId: req.user!.id } },
    orderBy: { chunkIndex: "asc" }
  });
  res.json({ chunks: chunks.map((chunk) => ({ ...chunk, content: chunk.contentRedacted })) });
}));

router.post("/:id/reindex", asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!document) return res.status(404).json({ message: "Documento nao encontrado." });
  await prisma.document.update({ where: { id: document.id }, data: { status: "indexed" } });
  await writeSystemLog({ userId: req.user!.id, module: "documents", action: "reindex", message: "Documento marcado para reindexacao segura", metadata: { documentId: document.id } });
  res.json({ status: "indexed", documentId: document.id });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.document.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  res.status(204).send();
}));

export default router;
