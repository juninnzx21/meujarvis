import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  reminderAt: z.string().datetime().optional().nullable(),
  status: z.enum(["pending", "in_progress", "done", "canceled"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium")
});

router.get("/", asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const overdue = req.query.overdue === "true";
  const today = req.query.today === "true";
  const tasks = await prisma.task.findMany({
    where: {
      userId: req.user!.id,
      ...(status ? { status: status as never } : {}),
      ...(priority ? { priority: priority as never } : {}),
      ...(overdue ? { status: { notIn: ["done", "canceled"] as const }, dueDate: { lt: now } } : {}),
      ...(today ? { dueDate: { gte: todayStart, lte: todayEnd } } : {})
    },
    orderBy: { createdAt: "desc" }
  });
  res.json({ tasks });
}));

router.get("/pending-overdue", asyncHandler(async (req, res) => {
  const now = new Date();
  const [pending, overdue] = await Promise.all([
    prisma.task.findMany({ where: { userId: req.user!.id, status: { notIn: ["done", "canceled"] } }, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({ where: { userId: req.user!.id, status: { notIn: ["done", "canceled"] }, dueDate: { lt: now } }, orderBy: { dueDate: "asc" } })
  ]);
  res.json({ pending, overdue });
}));

router.post("/", validate(schema), asyncHandler(async (req, res) => {
  const task = await prisma.task.create({ data: { ...req.body, dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null, reminderAt: req.body.reminderAt ? new Date(req.body.reminderAt) : null, userId: req.user!.id } });
  await writeSystemLog({ userId: req.user!.id, module: "tasks", action: "create", message: "Tarefa criada" });
  res.status(201).json({ task });
}));

router.put("/:id", validate(schema.partial()), asyncHandler(async (req, res) => {
  const task = await prisma.task.update({ where: { id: String(req.params.id), userId: req.user!.id }, data: { ...req.body, dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate, reminderAt: req.body.reminderAt ? new Date(req.body.reminderAt) : req.body.reminderAt } });
  res.json({ task });
}));

router.patch("/:id/status", validate(z.object({ status: z.enum(["pending", "in_progress", "done", "canceled"]) })), asyncHandler(async (req, res) => {
  const task = await prisma.task.update({ where: { id: String(req.params.id), userId: req.user!.id }, data: { status: req.body.status } });
  res.json({ task });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.task.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  res.status(204).send();
}));

export default router;
