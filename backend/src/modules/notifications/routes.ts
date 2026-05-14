import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const unread = req.query.unread === "true";
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const today = req.query.today === "true";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const where = {
    userId: req.user!.id,
    ...(unread ? { readAt: null } : {}),
    ...(type ? { type: type as never } : {}),
    ...(today ? { createdAt: { gte: todayStart, lte: todayEnd } } : {})
  };
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.notification.count({ where: { userId: req.user!.id, readAt: null } })
  ]);
  res.json({ notifications, unreadCount });
}));

router.patch("/read-all", asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
}));

router.patch("/:id/read", asyncHandler(async (req, res) => {
  const notification = await prisma.notification.update({ where: { id: String(req.params.id), userId: req.user!.id }, data: { readAt: new Date() } });
  res.json({ notification });
}));

export default router;
