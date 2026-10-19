import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";
import { writeSystemLog } from "./services/systemLogService.js";
import { createRequestObservabilityMiddleware, httpMetrics } from "./utils/httpMetrics.js";
import { logger } from "./utils/logger.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(createRequestObservabilityMiddleware(httpMetrics, (entry, message) => {
  const statusCode = typeof entry.statusCode === "number" ? entry.statusCode : 0;
  if (statusCode < 500) return;
  logger.error(entry, message);
  if (httpMetrics.shouldPersistFailureAlert(String(entry.route), statusCode)) {
    void writeSystemLog({
      level: "error",
      module: "http",
      action: "request_failed",
      message: `Falha HTTP ${statusCode} na rota ${entry.route}`,
      metadata: {
        requestId: entry.requestId,
        method: entry.method,
        route: entry.route,
        statusCode,
        durationMs: entry.durationMs
      }
    });
  }
}));
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true, exposedHeaders: ["X-Jarvis-TTS-Provider", "X-Request-Id"] }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: env.NODE_ENV === "test" ? 1000 : 180, standardHeaders: true, legacyHeaders: false }));
app.use("/api", routes);

app.use((_req, res) => res.status(404).json({ message: "Rota nao encontrada" }));
app.use(errorHandler);
