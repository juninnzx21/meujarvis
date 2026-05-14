import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ notifications });
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
