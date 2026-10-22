import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  grantCreate: vi.fn(),
  transaction: vi.fn(),
  matchCounter: vi.fn(),
  decryptSecret: vi.fn(),
  writeLog: vi.fn()
}));

vi.mock("../../middlewares/auth.js", () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    Object.assign(req, { user: { id: "admin-user", email: "admin@example.invalid", name: "Admin", role: "admin" } });
    next();
  }
}));
vi.mock("../../prisma/client.js", () => ({
  prisma: { user: { findUnique: mocks.findUnique }, $transaction: mocks.transaction }
}));
vi.mock("../../services/totpService.js", () => ({
  createTotpProvisioningUri: vi.fn(), generateTotpSecret: vi.fn(), matchTotpCounter: mocks.matchCounter
}));
vi.mock("../../services/totpSecretService.js", () => ({
  createRecoveryCodes: vi.fn(), decryptTotpSecret: mocks.decryptSecret, encryptTotpSecret: vi.fn(), hashRecoveryCode: vi.fn()
}));
vi.mock("../../services/systemLogService.js", () => ({ writeSystemLog: mocks.writeLog }));

import authRoutes from "./routes.js";

describe("MFA step-up grant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({
      id: "admin-user", email: "admin@example.invalid", name: "Admin", role: "admin", authVersion: 4,
      totpEnabled: true, totpLastCounter: 122n, totpSecretEncrypted: "encrypted-test-fixture"
    });
    mocks.decryptSecret.mockReturnValue("synthetic-totp-secret");
    mocks.matchCounter.mockReturnValue(123n);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.grantCreate.mockResolvedValue({ id: "grant-1" });
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
      user: { updateMany: mocks.updateMany },
      mfaStepUpGrant: { create: mocks.grantCreate }
    }));
    mocks.writeLog.mockResolvedValue(undefined);
  });

  it("consumes a fresh TOTP counter and stores only a hash of the one-time grant id", async () => {
    const app = express().use(express.json()).use("/auth", authRoutes);
    const response = await request(app).post("/auth/mfa/step-up").send({ code: "123456" }).expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "admin-user", authVersion: 4, totpLastCounter: 122n }),
      data: { totpLastCounter: 123n }
    }));
    const grant = mocks.grantCreate.mock.calls[0][0].data;
    expect(grant.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(grant.tokenHash).not.toContain(response.body.token);
  });

  it("does not create a grant if the TOTP counter was already consumed", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const app = express().use(express.json()).use("/auth", authRoutes);

    await request(app).post("/auth/mfa/step-up").send({ code: "123456" }).expect(409);

    expect(mocks.grantCreate).not.toHaveBeenCalled();
  });
});
