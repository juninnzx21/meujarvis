import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env.js";

type JwtPayload = { sub: string; email: string; name: string; role: string };

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Token ausente" });

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role as UserRole };
    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido ou expirado" });
  }
};
