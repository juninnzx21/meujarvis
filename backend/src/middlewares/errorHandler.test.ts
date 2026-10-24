import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("../utils/logger.js", () => ({ logger: { error: mocks.error } }));

import { errorHandler } from "./errorHandler.js";
import { createHttpMetrics, createRequestObservabilityMiddleware } from "../utils/httpMetrics.js";

describe("errorHandler", () => {
  it("returns a correlation id and omits raw error details from logs", async () => {
    mocks.error.mockClear();
    const app = express();
    app.use(createRequestObservabilityMiddleware(createHttpMetrics(), () => undefined));
    app.get("/failure", () => { throw new Error("database password=secret-value"); });
    app.use(errorHandler);

    const response = await request(app).get("/failure?token=query-secret").expect(500);

    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    expect(JSON.stringify(response.body)).not.toContain("secret-value");
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain("secret-value");
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain("query-secret");
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain("stack");
  });
});
