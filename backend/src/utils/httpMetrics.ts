import { randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";

export interface HttpMetricsSnapshot {
  processStartedAt: string;
  requests: number;
  clientErrors: number;
  serverErrors: number;
  lastRequestAt: string | null;
}

export function createHttpMetrics(clock: () => Date = () => new Date()) {
  const processStartedAt = clock().toISOString();
  let requests = 0;
  let clientErrors = 0;
  let serverErrors = 0;
  let lastRequestAt: string | null = null;
  const lastFailureAlertAt = new Map<string, number>();

  return {
    record(statusCode: number) {
      requests += 1;
      if (statusCode >= 400 && statusCode < 500) clientErrors += 1;
      if (statusCode >= 500) serverErrors += 1;
      lastRequestAt = clock().toISOString();
    },
    shouldPersistFailureAlert(route: string, statusCode: number): boolean {
      const now = clock().getTime();
      const key = `${statusCode}:${route}`;
      const previous = lastFailureAlertAt.get(key);
      if (previous !== undefined && now - previous < 60_000) return false;
      lastFailureAlertAt.set(key, now);
      if (lastFailureAlertAt.size > 100) {
        const oldestKey = lastFailureAlertAt.keys().next().value;
        if (oldestKey !== undefined) lastFailureAlertAt.delete(oldestKey);
      }
      return true;
    },
    snapshot(): HttpMetricsSnapshot {
      return { processStartedAt, requests, clientErrors, serverErrors, lastRequestAt };
    }
  };
}

export const httpMetrics = createHttpMetrics();

type RequestMetrics = ReturnType<typeof createHttpMetrics>;

export function createRequestObservabilityMiddleware(
  metrics: RequestMetrics,
  writeLog: (entry: Record<string, string | number>, message: string) => void,
  clock: () => bigint = () => process.hrtime.bigint()
): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();
    const startedAt = clock();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    res.on("finish", () => {
      const statusCode = res.statusCode;
      metrics.record(statusCode);
      const durationMs = Number(clock() - startedAt) / 1_000_000;
      writeLog({
        requestId,
        method: req.method,
        route: getSafeRouteLabel(req),
        statusCode,
        durationMs: Math.round(durationMs * 100) / 100
      }, "http request");
    });
    next();
  };
}

/** Return an Express route template only; never use the raw URL or its query. */
export function getSafeRouteLabel(request: Request): string {
  const route = request.route?.path;
  if (typeof route === "string") return route.slice(0, 200);
  if (Array.isArray(route)) return route.filter((item): item is string => typeof item === "string").join("|").slice(0, 200) || "unmatched";
  return "unmatched";
}
