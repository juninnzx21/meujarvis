import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";

type JwtPayload = { sub: string; email: string; name: string; role: string; ver?: number; purpose?: string };

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Token ausente" });

  let payload: JwtPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload;
    if (payload.purpose || typeof payload.sub !== "string") return res.status(401).json({ message: "Token invalido ou expirado" });
  } catch {
    return res.status(401).json({ message: "Token invalido ou expirado" });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, role: true, authVersion: true } });
    if (!user || user.authVersion !== (payload.ver ?? 0)) return res.status(401).json({ message: "Sessao revogada ou expirada" });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role as UserRole };
    return next();
  } catch (error) {
    return next(error);
  }
};
