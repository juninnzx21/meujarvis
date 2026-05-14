import type { ErrorRequestHandler } from "express";
import { isProduction } from "../config/env.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = Number(err.statusCode || err.status || 500);
  const safeMessage = typeof err.message === "string" ? err.message : "Erro inesperado";

  logger.error(
    {
      error: {
        name: err.name,
        message: safeMessage,
        status,
        stack: isProduction ? undefined : err.stack
      }
    },
    "Unhandled application error"
  );

  res.status(status).json({
    message: status >= 500 ? "Erro interno do servidor" : safeMessage,
    ...(isProduction ? {} : { detail: safeMessage })
  });
};
