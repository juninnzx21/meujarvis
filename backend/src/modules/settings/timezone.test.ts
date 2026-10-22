import { describe, expect, it } from "vitest";
import { DEFAULT_USER_TIMEZONE, isValidIanaTimezone, timezoneSchema } from "./timezone.js";

describe("timezone profile validation", () => {
  it("accepts IANA zones and rejects unknown, empty or oversized values", () => {
    expect(DEFAULT_USER_TIMEZONE).toBe("America/Sao_Paulo");
    expect(timezoneSchema.safeParse("America/Sao_Paulo").success).toBe(true);
    expect(timezoneSchema.safeParse("Europe/Lisbon").success).toBe(true);
    expect(timezoneSchema.safeParse("Invalid/Zone").success).toBe(false);
    expect(timezoneSchema.safeParse("").success).toBe(false);
    expect(timezoneSchema.safeParse("A".repeat(65)).success).toBe(false);
  });
});
