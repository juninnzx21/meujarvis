import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  systemLogCount: vi.fn(),
  systemLogFindMany: vi.fn(),
  systemLogFindFirst: vi.fn(),
  importCount: vi.fn(),
  importRowCount: vi.fn(),
  whatsappStatus: vi.fn(),
  whatsappHealthStatus: vi.fn(),
  homeAssistantStatus: vi.fn(),
  homeAssistantHealthStatus: vi.fn(),
  n8nStatus: vi.fn(),
  n8nHealthStatus: vi.fn(),
  openAiStatus: vi.fn(),
  openAiUserStatus: vi.fn(),
  openAiHealthStatus: vi.fn(),
  geminiStatus: vi.fn(),
  geminiUserStatus: vi.fn(),
  geminiHealthStatus: vi.fn()
}));

vi.mock("../prisma/client.js", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    systemLog: { count: mocks.systemLogCount, findMany: mocks.systemLogFindMany, findFirst: mocks.systemLogFindFirst },
    statementImport: { count: mocks.importCount },
    statementImportRow: { count: mocks.importRowCount }
  }
}));
vi.mock("./whatsappService.js", () => ({ whatsappService: { configured: false, status: mocks.whatsappStatus, healthStatusForUser: mocks.whatsappHealthStatus } }));
vi.mock("./homeAssistantService.js", () => ({ homeAssistantService: { configured: false, status: mocks.homeAssistantStatus, healthStatusForUser: mocks.homeAssistantHealthStatus } }));
vi.mock("./n8nService.js", () => ({ n8nService: { configured: false, status: mocks.n8nStatus, userStatus: mocks.n8nStatus, healthStatusForUser: mocks.n8nHealthStatus } }));
vi.mock("./openAiService.js", () => ({ openAiService: { configured: false, status: mocks.openAiStatus, statusForUser: mocks.openAiUserStatus, healthStatusForUser: mocks.openAiHealthStatus } }));
vi.mock("./geminiService.js", () => ({ geminiService: { configured: false, status: mocks.geminiStatus, statusForUser: mocks.geminiUserStatus, healthStatusForUser: mocks.geminiHealthStatus } }));
vi.mock("./schedulerService.js", () => ({ schedulerService: { status: () => ({ enabled: false, running: false, intervalSeconds: 60, lastRunAt: "2026-10-18T00:00:00.000Z", lastError: "synthetic global scheduler error", errorCountRecent: 4 }) } }));

import { getHealth } from "./healthService.js";

describe("getHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockResolvedValue([]);
    mocks.systemLogCount.mockResolvedValue(3);
    mocks.systemLogFindMany.mockResolvedValue([{
      id: "log-test",
      level: "error",
      module: "test",
      action: "test",
      message: "Request failed ?token=private-value",
      createdAt: new Date("2026-10-18T00:00:00.000Z")
    }]);
    mocks.systemLogFindFirst.mockResolvedValue({ createdAt: new Date("2026-10-17T00:00:00.000Z") });
    mocks.importCount.mockResolvedValue(2);
    mocks.importRowCount.mockResolvedValue(4);
    mocks.whatsappStatus.mockResolvedValue({ configured: true, status: "configured", autoReply: false });
    mocks.whatsappHealthStatus.mockResolvedValue({ configured: false, status: "not_configured" });
    mocks.homeAssistantStatus.mockResolvedValue({ configured: false, status: "not_configured" });
    mocks.homeAssistantHealthStatus.mockResolvedValue({ configured: false, status: "not_configured" });
    mocks.n8nStatus.mockResolvedValue({ configured: false, status: "not_configured" });
    mocks.n8nHealthStatus.mockResolvedValue({ configured: false, status: "not_configured" });
    mocks.openAiStatus.mockResolvedValue({ configured: true, status: "configured", model: "global-model" });
    mocks.openAiUserStatus.mockResolvedValue({ configured: false, status: "missing_key", model: "user-model" });
    mocks.openAiHealthStatus.mockResolvedValue({ configured: false, status: "not_configured" });
    mocks.geminiStatus.mockResolvedValue({ configured: true, status: "configured", model: "global-model" });
    mocks.geminiUserStatus.mockResolvedValue({ configured: true, status: "configured", model: "user-model" });
    mocks.geminiHealthStatus.mockResolvedValue({ configured: false, status: "not_configured" });
  });

  it("does not expose global scheduler execution details through basic health", async () => {
    const health = await getHealth(false);

    expect(health.scheduler).toMatchObject({ enabled: false, running: false, intervalSeconds: 60, lastRunAt: null, lastError: null, errorCountRecent: 0 });
  });

  it("returns degraded readiness instead of throwing when the database is unavailable", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("connection string contains private-value"));

    const health = await getHealth(true, "synthetic-user");

    expect(health).toMatchObject({ app: "ok", readiness: "degraded", database: "error" });
    expect(health.observability).toMatchObject({ queryStatus: "unavailable", logsCount: null, recentFailures: [] });
    expect(mocks.systemLogCount).not.toHaveBeenCalled();
    expect(mocks.importCount).not.toHaveBeenCalled();
    expect(mocks.importRowCount).not.toHaveBeenCalled();
  });

  it("reports counters and marks configured integrations as not checked for connectivity", async () => {
    const health = await getHealth(true, "synthetic-user");

    expect(health).toMatchObject({ readiness: "ready", database: "ok" });
    expect(health.observability).toMatchObject({ queryStatus: "ok", logsCount: 3 });
    expect(JSON.stringify(health.observability?.recentFailures)).not.toContain("private-value");
    expect(health.integrations.whatsapp).toMatchObject({ configured: false, status: "not_configured", connectivity: "not_checked" });
    expect(health.integrations.homeAssistant.connectivity).toBe("not_checked");
    expect(health.observability.http).toBeNull();
    expect(health.scheduler).toMatchObject({ lastRunAt: null, lastError: null, errorCountRecent: 0 });
    expect(health.integrations.openai).toMatchObject({ status: "not_configured" });
    expect(health.integrations.gemini).toMatchObject({ status: "not_configured" });
    expect(JSON.stringify(health.integrations)).not.toMatch(/webhookUrl|apiUrl|apiKeyMasked|instance|publicHealthUrl/);
    expect(mocks.openAiStatus).not.toHaveBeenCalled();
    expect(mocks.geminiStatus).not.toHaveBeenCalled();
    expect(mocks.whatsappStatus).not.toHaveBeenCalled();
    expect(mocks.homeAssistantStatus).not.toHaveBeenCalled();
    expect(mocks.n8nStatus).not.toHaveBeenCalled();
  });

  it("scopes detailed logs and finance counts to the authenticated user's own records", async () => {
    await getHealth(true, "synthetic-user", false);

    expect(mocks.systemLogCount).toHaveBeenCalledWith({ where: { userId: "synthetic-user" } });
    expect(mocks.systemLogFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "synthetic-user", level: { in: ["error", "warning", "security"] } }
    }));
    expect(mocks.importCount).toHaveBeenCalledWith({
      where: { userId: "synthetic-user", status: { in: ["uploaded", "parsed", "review_required"] } }
    });
    expect(mocks.importRowCount).toHaveBeenCalledWith({
      where: { status: "pending", import: { is: { userId: "synthetic-user" } } }
    });
    expect(mocks.systemLogFindFirst).not.toHaveBeenCalled();
  });

  it("allows system-wide diagnostics only when the caller is explicitly an administrator", async () => {
    const health = await getHealth(true, "synthetic-admin", true);

    expect(mocks.systemLogCount).toHaveBeenCalledWith({ where: {} });
    expect(mocks.systemLogFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { level: { in: ["error", "warning", "security"] } }
    }));
    expect(mocks.importCount).toHaveBeenCalledWith({
      where: { status: { in: ["uploaded", "parsed", "review_required"] } }
    });
    expect(mocks.importRowCount).toHaveBeenCalledWith({ where: { status: "pending" } });
    expect(mocks.systemLogFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { module: "backup" } }));
    expect(health.observability.http).toMatchObject({ requests: expect.any(Number), clientErrors: expect.any(Number), serverErrors: expect.any(Number) });
    expect(mocks.openAiStatus).toHaveBeenCalled();
    expect(mocks.geminiStatus).toHaveBeenCalled();
  });

  it("reports unknown dependency state instead of claiming configured or disconnected after a status error", async () => {
    mocks.whatsappHealthStatus.mockRejectedValue(new Error("private setting value"));

    const health = await getHealth(true, "synthetic-user");

    expect(health.database).toBe("ok");
    expect(health.integrations.whatsapp).toMatchObject({ configured: null, status: "unknown", connectivity: "unknown" });
  });
});
