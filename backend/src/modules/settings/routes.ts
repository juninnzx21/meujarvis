import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { encryptSettingValue, publicSettingValue } from "../../services/encryptionService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { DEFAULT_USER_TIMEZONE, timezoneSchema } from "./timezone.js";

const router = Router();
router.use(authMiddleware);

router.get("/profile", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { timezone: true } });
  res.json({ profile: { timezone: user.timezone || DEFAULT_USER_TIMEZONE } });
}));

router.patch("/profile/timezone", validate(z.object({ timezone: timezoneSchema }).strict()), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { timezone: req.body.timezone }, select: { timezone: true } });
  res.json({ profile: { timezone: user.timezone } });
}));

router.get("/", asyncHandler(async (req, res) => {
  const rows = await prisma.setting.findMany({ where: { userId: req.user!.id } });
  res.json({ settings: Object.fromEntries(rows.map((row) => [row.key, publicSettingValue(row.key, row.value)])) });
}));

router.put("/", validate(z.record(z.unknown())), asyncHandler(async (req, res) => {
  await Promise.all(Object.entries(req.body).map(([key, value]) => prisma.setting.upsert({
    where: { userId_key: { userId: req.user!.id, key } },
    update: { value: encryptSettingValue(key, value) as never },
    create: { userId: req.user!.id, key, value: encryptSettingValue(key, value) as never }
  })));
  res.json({ message: "Configuracoes salvas" });
}));

export default router;
