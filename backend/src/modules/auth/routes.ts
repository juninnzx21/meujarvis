import { Router } from "express";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { writeSystemLog } from "../../services/systemLogService.js";

const router = Router();
const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const registerSchema = credentialsSchema.extend({ name: z.string().min(2) });

function sign(user: { id: string; email: string; name: string; role: string }) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, env.JWT_SECRET, options);
}

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role: "user" } });
  await writeSystemLog({ userId: user.id, module: "auth", action: "register", message: "Usuario registrado" });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: sign(user) });
}));

router.post("/login", validate(credentialsSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    await writeSystemLog({ level: "security", module: "auth", action: "login_failed", message: "Tentativa de login invalida", metadata: { email } });
    return res.status(401).json({ message: "Email ou senha invalidos" });
  }
  await writeSystemLog({ userId: user.id, module: "auth", action: "login", message: "Login realizado" });
  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: sign(user) });
}));

router.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

export default router;
