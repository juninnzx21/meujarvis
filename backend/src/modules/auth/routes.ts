import crypto from "node:crypto";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import QRCode from "qrcode";
import { z } from "zod";
import { env } from "../../config/env.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { createTotpProvisioningUri, generateTotpSecret, matchTotpCounter } from "../../services/totpService.js";
import { createRecoveryCodes, decryptTotpSecret, encryptTotpSecret, hashRecoveryCode } from "../../services/totpSecretService.js";

const router = Router();
// Authentication responses include short-lived challenges and, during enrollment,
// the TOTP secret and recovery codes. Keep intermediaries and browsers from caching them.
router.use((_req, res, next) => {
  res.set({ "Cache-Control": "no-store", Pragma: "no-cache" });
  next();
});
const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const registerSchema = credentialsSchema.extend({ name: z.string().min(2) });
const totpLoginSchema = z.object({ challengeToken: z.string().min(20), code: z.string().trim().min(6).max(32) });
const setupStartSchema = z.object({ setupToken: z.string().min(20) });
const setupConfirmSchema = z.object({ setupToken: z.string().min(20), code: z.string().trim().length(6) });
const disableSchema = z.object({ password: z.string().min(8), code: z.string().trim().min(6).max(32) });

type AuthUser = { id: string; email: string; name: string; role: string; authVersion: number };

function sign(user: AuthUser) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role, ver: user.authVersion }, env.JWT_SECRET, options);
}

function signTotpChallenge(user: AuthUser) {
  return jwt.sign({ sub: user.id, purpose: "totp", ver: user.authVersion }, env.JWT_SECRET, { expiresIn: "5m" });
}

function signSetupChallenge(user: AuthUser) {
  return jwt.sign({ sub: user.id, purpose: "totp_setup", ver: user.authVersion }, env.JWT_SECRET, { expiresIn: "10m" });
}

async function resolveSetupUser(token: string) {
  const claims = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (claims.purpose !== "totp_setup" || typeof claims.sub !== "string" || typeof claims.ver !== "number") return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.role !== "admin" || user.totpEnabled || user.authVersion !== claims.ver) return null;
  return user;
}

function isAdmin(user: { role: string }) {
  return user.role === "admin";
}

function requireEncryptionKey(res: import("express").Response) {
  if (env.TOTP_ENCRYPTION_KEY.length >= 32) return true;
  res.status(503).json({ message: "MFA indisponivel: configure TOTP_ENCRYPTION_KEY com pelo menos 32 caracteres no backend." });
  return false;
}

function recoveryHashes(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : [];
}

async function consumeRecoveryCode(user: { id: string; authVersion: number; totpRecoveryCodeHashes: unknown }, suppliedCode: string) {
  const existing = recoveryHashes(user.totpRecoveryCodeHashes);
  const digest = hashRecoveryCode(suppliedCode);
  const index = existing.findIndex((value) => value.length === digest.length && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(digest)));
  if (index < 0) return false;
  const remaining = existing.filter((_value, current) => current !== index);
  const result = await prisma.user.updateMany({
    where: { id: user.id, authVersion: user.authVersion, totpEnabled: true },
    data: { totpRecoveryCodeHashes: remaining, authVersion: { increment: 1 } }
  });
  return result.count === 1;
}

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role: "user" } });
  await writeSystemLog({ userId: user.id, module: "auth", action: "register", message: "Usuario registrado" });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: sign({ ...user, authVersion: user.authVersion }) });
}));

router.post("/login", validate(credentialsSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const isDemo = email.toLowerCase() === "admin@jarvis.local";
  if (isDemo && !env.ALLOW_DEMO_LOGIN) {
    await writeSystemLog({ level: "security", module: "auth", action: "demo_login_blocked", message: "Login demo bloqueado por configuracao de producao", metadata: { email } });
    return res.status(403).json({ message: "Login demo desativado neste ambiente." });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    await writeSystemLog({ level: "security", module: "auth", action: "login_failed", message: "Tentativa de login invalida", metadata: { email } });
    return res.status(401).json({ message: "Email ou senha invalidos" });
  }
  if (isAdmin(user) && !user.totpEnabled) {
    if (!requireEncryptionKey(res)) return;
    return res.status(202).json({ mfaSetupRequired: true, setupToken: signSetupChallenge(user) });
  }
  if (isAdmin(user) && user.totpEnabled) {
    if (!requireEncryptionKey(res)) return;
    return res.status(202).json({ mfaRequired: true, challengeToken: signTotpChallenge(user) });
  }
  await writeSystemLog({ userId: user.id, module: "auth", action: "login", message: "Login realizado" });
  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: sign({ ...user, authVersion: user.authVersion }) });
}));

router.post("/login/totp", validate(totpLoginSchema), asyncHandler(async (req, res) => {
  if (!requireEncryptionKey(res)) return;
  let claims: jwt.JwtPayload;
  try {
    const verified = jwt.verify(req.body.challengeToken, env.JWT_SECRET);
    if (typeof verified === "string" || verified.purpose !== "totp" || typeof verified.sub !== "string" || typeof verified.ver !== "number") throw new Error("invalid challenge");
    claims = verified;
  } catch {
    return res.status(401).json({ message: "Desafio MFA invalido ou expirado" });
  }
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || !isAdmin(user) || !user.totpEnabled || user.authVersion !== claims.ver || !user.totpSecretEncrypted) {
    return res.status(401).json({ message: "Desafio MFA invalido ou expirado" });
  }

  let consumed = false;
  try {
    const secret = decryptTotpSecret(user.totpSecretEncrypted);
    const counter = matchTotpCounter(secret, req.body.code);
    if (counter !== null && (user.totpLastCounter === null || counter > user.totpLastCounter)) {
      const result = await prisma.user.updateMany({
        where: { id: user.id, authVersion: user.authVersion, totpEnabled: true, totpLastCounter: user.totpLastCounter },
        data: { totpLastCounter: counter }
      });
      consumed = result.count === 1;
    } else {
      consumed = await consumeRecoveryCode(user, req.body.code);
    }
  } catch {
    return res.status(503).json({ message: "MFA indisponivel. Verifique a chave de cifragem do backend." });
  }
  if (!consumed) return res.status(401).json({ message: "Codigo MFA invalido, expirado ou ja utilizado" });

  const current = await prisma.user.findUnique({ where: { id: user.id } });
  if (!current || current.role !== "admin") return res.status(401).json({ message: "Conta indisponivel" });
  await writeSystemLog({ userId: current.id, module: "auth", action: "login_mfa", message: "Login administrativo com MFA realizado" });
  return res.json({ user: { id: current.id, name: current.name, email: current.email, role: current.role }, token: sign({ ...current, authVersion: current.authVersion }) });
}));

router.get("/mfa/status", authMiddleware, asyncHandler(async (req, res) => {
  if (req.user!.role !== "admin") return res.status(403).json({ message: "Somente administradores podem gerenciar MFA" });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { totpEnabled: true, totpRecoveryCodeHashes: true } });
  return res.json({ enabled: Boolean(user?.totpEnabled), recoveryCodesRemaining: recoveryHashes(user?.totpRecoveryCodeHashes).length });
}));

router.post("/mfa/enrollment/start", validate(setupStartSchema), asyncHandler(async (req, res) => {
  if (!requireEncryptionKey(res)) return;
  let user;
  try { user = await resolveSetupUser(req.body.setupToken); }
  catch { return res.status(401).json({ message: "Desafio de configuração invalido ou expirado" }); }
  if (!user) return res.status(401).json({ message: "Desafio de configuração invalido ou expirado" });
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpPendingSecretEncrypted: encryptTotpSecret(secret) } });
  const provisioningUri = createTotpProvisioningUri({ secret, account: user.email, issuer: "JARVIS" });
  const qrDataUrl = await QRCode.toDataURL(provisioningUri, { errorCorrectionLevel: "M", margin: 2, width: 256 });
  return res.json({ secret, provisioningUri, qrDataUrl });
}));

router.post("/mfa/enrollment/confirm", validate(setupConfirmSchema), asyncHandler(async (req, res) => {
  if (!requireEncryptionKey(res)) return;
  let user;
  try { user = await resolveSetupUser(req.body.setupToken); }
  catch { return res.status(401).json({ message: "Desafio de configuração invalido ou expirado" }); }
  if (!user || !user.totpPendingSecretEncrypted) return res.status(409).json({ message: "Inicie novamente a configuracao do autenticador" });
  let secret: string;
  let counter: bigint | null;
  try {
    secret = decryptTotpSecret(user.totpPendingSecretEncrypted);
    counter = matchTotpCounter(secret, req.body.code);
  } catch {
    return res.status(503).json({ message: "MFA indisponivel. Verifique a chave de cifragem do backend." });
  }
  if (counter === null) return res.status(401).json({ message: "Codigo TOTP invalido ou expirado" });
  const recovery = createRecoveryCodes();
  const result = await prisma.user.updateMany({
    where: { id: user.id, authVersion: user.authVersion, totpEnabled: false },
    data: {
      totpEnabled: true,
      totpSecretEncrypted: user.totpPendingSecretEncrypted,
      totpPendingSecretEncrypted: null,
      totpRecoveryCodeHashes: recovery.hashes,
      totpLastCounter: counter,
      authVersion: { increment: 1 }
    }
  });
  if (result.count !== 1) return res.status(409).json({ message: "A configuracao MFA mudou; tente novamente" });
  const current = await prisma.user.findUnique({ where: { id: user.id } });
  if (!current) return res.status(401).json({ message: "Conta indisponivel" });
  await writeSystemLog({ userId: current.id, level: "security", module: "auth", action: "mfa_enabled", message: "MFA administrativo ativado; sessoes anteriores revogadas" });
  return res.json({ enabled: true, recoveryCodes: recovery.codes, token: sign({ ...current, authVersion: current.authVersion }), user: { id: current.id, name: current.name, email: current.email, role: current.role } });
}));

router.post("/mfa/disable", authMiddleware, validate(disableSchema), asyncHandler(async (req, res) => {
  if (req.user!.role !== "admin") return res.status(403).json({ message: "Somente administradores podem desativar MFA" });
  if (!requireEncryptionKey(res)) return;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.totpEnabled || !user.totpSecretEncrypted) return res.status(409).json({ message: "MFA nao esta ativado" });
  if (!await bcrypt.compare(req.body.password, user.passwordHash)) return res.status(401).json({ message: "Senha invalida" });
  let consumed = false;
  try {
    const secret = decryptTotpSecret(user.totpSecretEncrypted);
    const counter = matchTotpCounter(secret, req.body.code);
    if (counter !== null && (user.totpLastCounter === null || counter > user.totpLastCounter)) {
      const update = await prisma.user.updateMany({
        where: { id: user.id, authVersion: user.authVersion, totpEnabled: true, totpLastCounter: user.totpLastCounter },
        data: { totpEnabled: false, totpSecretEncrypted: null, totpPendingSecretEncrypted: null, totpRecoveryCodeHashes: Prisma.DbNull, totpLastCounter: null, authVersion: { increment: 1 } }
      });
      consumed = update.count === 1;
    } else if (await consumeRecoveryCode(user, req.body.code)) {
      const update = await prisma.user.updateMany({
        where: { id: user.id, authVersion: user.authVersion + 1, totpEnabled: true },
        data: { totpEnabled: false, totpSecretEncrypted: null, totpPendingSecretEncrypted: null, totpRecoveryCodeHashes: Prisma.DbNull, totpLastCounter: null, authVersion: { increment: 1 } }
      });
      consumed = update.count === 1;
    }
  } catch {
    return res.status(503).json({ message: "MFA indisponivel. Verifique a chave de cifragem do backend." });
  }
  if (!consumed) return res.status(401).json({ message: "Codigo MFA invalido, expirado ou ja utilizado" });
  const current = await prisma.user.findUnique({ where: { id: user.id } });
  if (!current) return res.status(401).json({ message: "Conta indisponivel" });
  await writeSystemLog({ userId: current.id, level: "security", module: "auth", action: "mfa_disabled", message: "MFA desativado e sessoes anteriores revogadas" });
  return res.json({ enabled: false, token: sign({ ...current, authVersion: current.authVersion }), user: { id: current.id, name: current.name, email: current.email, role: current.role } });
}));

router.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

export default router;
