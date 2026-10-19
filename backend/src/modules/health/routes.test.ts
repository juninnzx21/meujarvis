import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getHealth: vi.fn() }));

vi.mock("../../middlewares/auth.js", () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    const role = req.header("x-test-role") === "admin" ? "admin" : "user";
    Object.assign(req, { user: { id: "synthetic-user", email: "test@example.invalid", name: "Test", role } });
    next();
  }
}));
vi.mock("../../services/healthService.js", () => ({ getHealth: mocks.getHealth }));

import healthRoutes from "./routes.js";

describe("detailed health route authorization", () => {
  beforeEach(() => {
    mocks.getHealth.mockReset();
    mocks.getHealth.mockResolvedValue({ app: "ok" });
  });

  it("requests owner-scoped diagnostics for an authenticated regular user", async () => {
    const app = express().use("/health", healthRoutes);

    await request(app).get("/health/full").expect(200);

    expect(mocks.getHealth).toHaveBeenCalledWith(true, "synthetic-user", false);
  });

  it("requests system-wide diagnostics only for an authenticated administrator", async () => {
    const app = express().use("/health", healthRoutes);

    await request(app).get("/health/full").set("x-test-role", "admin").expect(200);

    expect(mocks.getHealth).toHaveBeenCalledWith(true, "synthetic-user", true);
  });
});
