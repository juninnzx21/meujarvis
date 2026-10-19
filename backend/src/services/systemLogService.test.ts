import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), warn: vi.fn() }));
vi.mock("../prisma/client.js", () => ({ prisma: { systemLog: { create: mocks.create } } }));
vi.mock("../utils/logger.js", () => ({ logger: { warn: mocks.warn } }));

import { writeSystemLog } from "./systemLogService.js";

describe("writeSystemLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redacts sensitive query values before persisting a log message", async () => {
    mocks.create.mockResolvedValue(undefined);
    await writeSystemLog({ module: "test", action: "test", message: "callback ?token=private-value" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ message: "callback ?token=[REDACTED]" })
    }));
  });

  it("does not pass raw persistence errors to the application logger", async () => {
    mocks.create.mockRejectedValue(new Error("database password=private-value"));
    await writeSystemLog({ module: "test", action: "test", message: "safe" });
    expect(mocks.warn).toHaveBeenCalledWith({ errorType: "Error", module: "test" }, "Failed to persist system log");
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain("private-value");
  });
});
