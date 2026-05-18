import { Router } from "express";
import type { Request } from "express";
import type { Prisma, SystemLogLevel } from "@prisma/client";
import { authMiddleware } from "../../middlewares/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const validLevels = new Set<SystemLogLevel>(["info", "warning", "error", "security"]);
const defaultModules = [
  "whatsapp",
  "n8n",
  "scheduler",
  "routines",
  "integrations",
  "finance",
  "documents",
  "brain",
  "ai",
  "auth",
  "home-assistant"
];

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function buildLogWhere(req: Request) {
  const module = asString(req.query.module);
  const level = asString(req.query.level);
  const search = asString(req.query.search);
  const from = asString(req.query.from);
  const to = asString(req.query.to);
  const sinceId = asString(req.query.sinceId);
  const where: Prisma.SystemLogWhereInput = {
    ...(req.user!.role === "admin" ? {} : { userId: req.user!.id }),
    ...(module ? { module } : {}),
    ...(validLevels.has(level as SystemLogLevel) ? { level: level as SystemLogLevel } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    ...(search ? { OR: [{ module: { contains: search, mode: "insensitive" } }, { action: { contains: search, mode: "insensitive" } }, { message: { contains: search, mode: "insensitive" } }] } : {})
  };
  if (sinceId) where.id = { not: sinceId };
  return where;
}

router.get("/", asyncHandler(async (req, res) => {
  const take = asPositiveInt(req.query.take, 200, 500);
  const logs = await prisma.systemLog.findMany({
    where: buildLogWhere(req),
    orderBy: { createdAt: "desc" },
    select: { id: true, level: true, module: true, action: true, message: true, metadata: true, createdAt: true },
    take
  });
  res.json({ logs });
}));

router.get("/summary", asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - asPositiveInt(req.query.hours, 12, 168) * 60 * 60 * 1000);
  const baseWhere: Prisma.SystemLogWhereInput = {
    ...(req.user!.role === "admin" ? {} : { userId: req.user!.id }),
    createdAt: { gte: since }
  };
  const [byLevel, byModule, recentIssues, latest] = await Promise.all([
    prisma.systemLog.groupBy({
      by: ["level"],
      where: baseWhere,
      _count: { _all: true }
    }),
    prisma.systemLog.groupBy({
      by: ["module"],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { _count: { module: "desc" } },
      take: 12
    }),
    prisma.systemLog.findMany({
      where: { ...baseWhere, level: { in: ["warning", "error", "security"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, level: true, module: true, action: true, message: true, createdAt: true },
      take: 10
    }),
    prisma.systemLog.findFirst({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      select: { id: true, level: true, module: true, action: true, message: true, createdAt: true }
    })
  ]);

  res.json({
    since: since.toISOString(),
    levels: byLevel.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.level]: item._count._all }), {}),
    modules: byModule.map((item) => ({ module: item.module, total: item._count._all })),
    recentIssues,
    latest,
    watchedModules: defaultModules
  });
}));

export default router;
