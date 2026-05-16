import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { embeddingService } from "../../services/embeddingService.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const schema = z.object({
  type: z.enum(["preference", "fact", "reminder", "note", "system"]).default("note"),
  title: z.string().min(2),
  content: z.string().min(2),
  tags: z.array(z.string()).default([]),
  importance: z.number().int().min(1).max(5).default(3)
});

router.get("/", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "");
  const memories = await prisma.memory.findMany({
    where: { userId: req.user!.id, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { updatedAt: "desc" }
  });
  res.json({ memories });
}));

router.get("/search", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ memories: [] });
  const memories = await embeddingService.searchMemories(req.user!.id, q);
  res.json({ memories, provider: embeddingService.provider, semantic: true });
}));

router.post("/", validate(schema), asyncHandler(async (req, res) => {
  const memory = await prisma.memory.create({ data: { ...req.body, userId: req.user!.id } });
  await embeddingService.ensureMemoryEmbedding(memory.id);
  await writeSystemLog({ userId: req.user!.id, module: "memory", action: "create", message: "Memoria criada" });
  res.status(201).json({ memory });
}));

router.put("/:id", validate(schema.partial()), asyncHandler(async (req, res) => {
  const memory = await prisma.memory.update({ where: { id: String(req.params.id), userId: req.user!.id }, data: req.body });
  res.json({ memory });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.memory.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  res.status(204).send();
}));

export default router;
