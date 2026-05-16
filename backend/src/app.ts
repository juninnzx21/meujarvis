import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";
import { logger } from "./utils/logger.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.on("finish", () => logger.info({ method: req.method, url: req.originalUrl, statusCode: res.statusCode }, "http request"));
  next();
});

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.use("/api", routes);

app.use((_req, res) => res.status(404).json({ message: "Rota nao encontrada" }));
app.use(errorHandler);
