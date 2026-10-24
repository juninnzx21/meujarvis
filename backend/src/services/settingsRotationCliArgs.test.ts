import { describe, expect, it } from "vitest";
import { parseSettingsRotationArgs } from "./settingsRotationCliArgs.js";

describe("SEC-002 settings rotation CLI arguments", () => {
  it("accepts normal execution and the explicit read-only dry-run option", () => {
    expect(parseSettingsRotationArgs([])).toEqual({ success: true, dryRun: false });
    expect(parseSettingsRotationArgs(["--dry-run"])).toEqual({ success: true, dryRun: true });
  });

  it.each([
    { args: ["--confirm-non-test-database"] },
    { args: ["--confirm-production"] },
    { args: ["--dry-run", "--dry-run"] },
    { args: ["--dry-run", "--confirm-non-test-database"] }
  ])("rejects bypass arguments $args", ({ args }) => {
    expect(parseSettingsRotationArgs(args)).toEqual({ success: false });
  });
});
