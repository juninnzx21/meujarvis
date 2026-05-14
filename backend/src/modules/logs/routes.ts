import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const { module, level, from, to } = req.query;
  const logs = await prisma.systemLog.findMany({
    where: {
      userId: req.user!.id,
      ...(module ? { module: String(module) } : {}),
      ...(level ? { level: level as never } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(String(from)) } : {}), ...(to ? { lte: new Date(String(to)) } : {}) } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  res.json({ logs });
}));

export default router;
