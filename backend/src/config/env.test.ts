import { describe, expect, it } from "vitest";
import { envSchema } from "./env.js";

const validEnvironment = {
  DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:55433/jarvis_agent_sync_test",
  JWT_SECRET: "synthetic-jwt-secret-with-more-than-32-characters"
};

describe("encryption key separation", () => {
  it.each(["SETTINGS_ENCRYPTION_KEY", "SETTINGS_ENCRYPTION_KEY_OLD", "TOTP_ENCRYPTION_KEY"])(
    "rejects %s when it reuses JWT_SECRET",
    (keyName) => {
      const parsed = envSchema.safeParse({
        ...validEnvironment,
        [keyName]: validEnvironment.JWT_SECRET
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((issue) => issue.path[0] === keyName)).toBe(true);
      }
    }
  );

  it("accepts dedicated current and previous keys distinct from JWT_SECRET", () => {
    const parsed = envSchema.safeParse({
      ...validEnvironment,
      SETTINGS_ENCRYPTION_KEY: "synthetic-current-settings-key-00000000",
      SETTINGS_ENCRYPTION_KEY_OLD: "synthetic-previous-settings-key-000000",
      TOTP_ENCRYPTION_KEY: "synthetic-totp-encryption-key-000000000"
    });

    expect(parsed.success).toBe(true);
  });
});
