import type { ErrorRequestHandler } from "express";
import { isProduction } from "../config/env.js";
import { redactSensitive } from "../utils/redact.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = Number(err.statusCode || err.status || 500);
  const safeMessage = typeof err.message === "string" ? String(redactSensitive(err.message)).slice(0, 500) : "Erro inesperado";
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : undefined;

  logger.error(
    {
      requestId,
      error: {
        name: err.name,
        status
      }
    },
    "Unhandled application error"
  );

  res.status(status).json({
    message: status >= 500 ? "Erro interno do servidor" : safeMessage,
    ...(requestId ? { requestId } : {}),
    ...(isProduction ? {} : { detail: safeMessage })
  });
};
