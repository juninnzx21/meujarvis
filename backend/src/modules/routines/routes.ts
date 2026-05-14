import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { runRoutineSafely } from "../../services/routineRunnerService.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  triggerType: z.enum(["manual", "schedule", "webhook", "ai_command"]).default("manual"),
  config: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true)
});

router.get("/", asyncHandler(async (req, res) => {
  const routines = await prisma.routine.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json({ routines });
}));

router.post("/", validate(schema), asyncHandler(async (req, res) => {
  const routine = await prisma.routine.create({ data: { ...req.body, userId: req.user!.id } });
  await writeSystemLog({ userId: req.user!.id, module: "routines", action: "create", message: "Rotina criada", metadata: { routineId: routine.id } });
  res.status(201).json({ routine });
}));

router.put("/:id", validate(schema.partial()), asyncHandler(async (req, res) => {
  const routine = await prisma.routine.update({ where: { id: String(req.params.id), userId: req.user!.id }, data: req.body });
  res.json({ routine });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.routine.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  res.status(204).send();
}));

router.post("/:id/run", asyncHandler(async (req, res) => {
  const routine = await prisma.routine.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!routine) return res.status(404).json({ message: "Rotina nao encontrada" });
  if (!routine.enabled) return res.status(400).json({ message: "Rotina desativada" });
  const result = await runRoutineSafely(routine, { ...(req.body ?? {}), source: "manual" });
  if ("error" in result) return res.status(500).json({ run: result.run, message: "Erro ao executar rotina" });
  return res.json(result);
}));

router.get("/:id/runs", asyncHandler(async (req, res) => {
  const runs = await prisma.routineRun.findMany({ where: { routineId: String(req.params.id), routine: { userId: req.user!.id } }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ runs });
}));

export default router;
