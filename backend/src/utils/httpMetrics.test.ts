import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createHttpMetrics, createRequestObservabilityMiddleware } from "./httpMetrics.js";

describe("HTTP request observability", () => {
  it("generates its own correlation id and logs only the route template, not query data", async () => {
    const metrics = createHttpMetrics(() => new Date("2026-10-18T00:00:00.000Z"));
    const entries: Array<Record<string, string | number>> = [];
    const app = express();
    app.use(createRequestObservabilityMiddleware(metrics, (entry) => entries.push(entry)));
    app.get("/items/:id", (_req, res) => res.status(200).json({ ok: true }));

    const response = await request(app)
      .get("/items/item-123?token=should-not-appear")
      .set("X-Request-Id", "client-controlled-value")
      .expect(200);

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.headers["x-request-id"]).not.toBe("client-controlled-value");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ requestId: response.headers["x-request-id"], method: "GET", route: "/items/:id", statusCode: 200 });
    expect(JSON.stringify(entries)).not.toContain("should-not-appear");
    expect(metrics.snapshot()).toMatchObject({ requests: 1, clientErrors: 0, serverErrors: 0, lastRequestAt: "2026-10-18T00:00:00.000Z" });
  });

  it("counts client and server failures without labels from request data", async () => {
    const metrics = createHttpMetrics();
    const app = express();
    app.use(createRequestObservabilityMiddleware(metrics, () => undefined));
    app.get("/client-error", (_req, res) => res.sendStatus(404));
    app.get("/server-error", (_req, res) => res.sendStatus(503));

    await request(app).get("/client-error").expect(404);
    await request(app).get("/server-error").expect(503);

    expect(metrics.snapshot()).toMatchObject({ requests: 2, clientErrors: 1, serverErrors: 1 });
  });

  it("deduplicates repeated local failure alerts per route and status for one minute", () => {
    let now = new Date("2026-10-18T00:00:00.000Z");
    const metrics = createHttpMetrics(() => now);

    expect(metrics.shouldPersistFailureAlert("/health", 503)).toBe(true);
    expect(metrics.shouldPersistFailureAlert("/health", 503)).toBe(false);
    expect(metrics.shouldPersistFailureAlert("/login", 503)).toBe(true);
    now = new Date(now.getTime() + 60_000);
    expect(metrics.shouldPersistFailureAlert("/health", 503)).toBe(true);
  });
});
