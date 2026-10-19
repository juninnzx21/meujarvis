import { defineConfig } from "vitest/config";
import { isVerifiedDisposablePostgresUrl } from "./src/test-utils/disposablePostgres.js";

const configuredTestDatabaseUrl = process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL?.trim() ?? "";
if (configuredTestDatabaseUrl && !isVerifiedDisposablePostgresUrl(configuredTestDatabaseUrl)) {
  throw new Error("Integration tests require the verified local disposable PostgreSQL container.");
}
const testDatabaseUrl = configuredTestDatabaseUrl || undefined;

export default defineConfig({
  test: {
    environment: "node",
    env: {
      JARVIS_AGENT_SYNC_TEST_DATABASE_CONFIGURED: testDatabaseUrl ? "true" : "false",
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl || "postgresql://jarvis-test-only:jarvis-test-only@127.0.0.1:55433/jarvis_agent_sync_test",
      ...(testDatabaseUrl ? { JARVIS_AGENT_SYNC_TEST_DATABASE_URL: testDatabaseUrl } : {}),
      JWT_SECRET: "agent-sync-local-test-only-jwt-secret-000000000000",
      SETTINGS_ENCRYPTION_KEY: "agent-sync-local-test-only-settings-key-0000000000",
      TOTP_ENCRYPTION_KEY: "agent-sync-local-test-only-totp-encryption-key-000000000000",
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "agent-sync-local-test-gemini-key",
      N8N_WEBHOOK_URL: "",
      N8N_API_KEY: "",
      EVOLUTION_API_URL: "",
      EVOLUTION_API_KEY: "",
      EVOLUTION_INSTANCE: "",
      HOME_ASSISTANT_URL: "",
      HOME_ASSISTANT_TOKEN: "",
      PIPER_TTS_URL: "",
      ALLOW_DEMO_LOGIN: "true",
      SCHEDULER_ENABLED: "false"
    },
    include: ["src/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false
  }
});
