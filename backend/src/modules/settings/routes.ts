import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const rows = await prisma.setting.findMany({ where: { userId: req.user!.id } });
  res.json({ settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
}));

router.put("/", validate(z.record(z.unknown())), asyncHandler(async (req, res) => {
  await Promise.all(Object.entries(req.body).map(([key, value]) => prisma.setting.upsert({
    where: { userId_key: { userId: req.user!.id, key } },
    update: { value: value as never },
    create: { userId: req.user!.id, key, value: value as never }
  })));
  res.json({ message: "Configuracoes salvas" });
}));

export default router;
