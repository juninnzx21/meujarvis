import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { buildActivityReport, buildDailySummary, buildSystemReport, buildTaskReport } from "../../services/reportService.js";
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

async function runRoutineReport(userId: string, report: string) {
  if (report === "tasks") return buildTaskReport(userId);
  if (report === "system" || report === "integrations") return buildSystemReport(userId);
  if (report === "activity") return buildActivityReport(userId);
  return buildDailySummary(userId);
}

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
  const run = await prisma.routineRun.create({ data: { routineId: routine.id, status: "pending", input: req.body ?? {} } });
  try {
    const config = routine.config as Record<string, unknown>;
    const output = await runRoutineReport(req.user!.id, String(config.report ?? "daily-summary"));
    const updated = await prisma.routineRun.update({ where: { id: run.id }, data: { status: "success", output: output as never } });
    await writeSystemLog({ userId: req.user!.id, module: "routines", action: "run", message: "Rotina executada", metadata: { routineId: routine.id, runId: updated.id } });
    return res.json({ run: updated, output });
  } catch (error) {
    const updated = await prisma.routineRun.update({ where: { id: run.id }, data: { status: "error", error: error instanceof Error ? error.message : "Erro desconhecido" } });
    return res.status(500).json({ run: updated, message: "Erro ao executar rotina" });
  }
}));

router.get("/:id/runs", asyncHandler(async (req, res) => {
  const runs = await prisma.routineRun.findMany({ where: { routineId: String(req.params.id), routine: { userId: req.user!.id } }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ runs });
}));

export default router;
