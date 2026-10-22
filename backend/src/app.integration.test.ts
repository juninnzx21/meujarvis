import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import axios from "axios";
import bcrypt from "bcrypt";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { parseInterCsvStatement } from "./modules/finance/parsers/interCsvParser.js";
import { parseOfxStatement } from "./modules/finance/parsers/ofxParser.js";
import { normalizeConnectionState, normalizeQrResponse } from "./modules/whatsapp/evolutionManagerService.js";
import { prisma } from "./prisma/client.js";
import { homeAssistantService } from "./services/homeAssistantService.js";
import { nvidiaSpeechService } from "./services/nvidiaSpeechService.js";
import { nvidiaAiService } from "./services/nvidiaAiService.js";
import { getAiProviderConfig, getAiProviderOrder } from "./services/aiProviderConfigService.js";
import { geminiService } from "./services/geminiService.js";
import { openAiService } from "./services/openAiService.js";
import { schedulerService } from "./services/schedulerService.js";
import { writeSystemLog } from "./services/systemLogService.js";
import { createTotpCode } from "./services/totpService.js";
import { assertDisposablePostgresConnection } from "./test-utils/disposablePostgres.js";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    request: vi.fn(),
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
  }
}));

vi.mocked(axios.post).mockResolvedValue({ status: 200, data: { ok: true } } as never);

const testRunId = randomUUID();
const credentials = { email: `sec002-api-${testRunId}@example.invalid`, password: "synthetic-sec002-api-password" };
const demoCredentials = { email: "admin@jarvis.local", password: "synthetic-only-password" };
const testTitlePrefix = `Teste automatizado ${testRunId}`;
const testTitle = (label: string) => `${testTitlePrefix} ${label}`;
let token = "";
let userId = "";
let financeAccountId = "";
let financeCategoryId = "";
let adminTotpSecret = "";
let adminRecoveryCodes: string[] = [];
let testDatabaseVerified = false;
let unrelatedFixtureUserId = "";
let unrelatedFixtureMemoryId = "";
let unrelatedFixtureTaskId = "";

function generateInterCsv(rows = 2221) {
  const lines = [
    "Extrato Conta Corrente",
    "Conta ;439443873",
    "Periodo ;17/10/2024 a 16/05/2026",
    "Saldo ;326,05",
    "",
    "Data Lancamento;Historico;Descricao;Valor;Saldo"
  ];
  for (let i = 0; i < rows; i += 1) {
    const day = String((i % 28) + 1).padStart(2, "0");
    const month = String((i % 12) + 1).padStart(2, "0");
    const year = i < 400 ? "2024" : i < 1600 ? "2025" : "2026";
    const amount = i % 2 === 0 ? "120,00" : "-49,90";
    const balance = (326.05 + i).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const history = i % 2 === 0 ? "Pix recebido" : "FABWEB HOSPEDAGEM";
    lines.push(`${day}/${month}/${year};${history};Cliente ${i};${amount};${balance}`);
  }
  return lines.join("\n");
}

function generateInterOfx(rows = 2221) {
  const transactions = Array.from({ length: rows }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, "0");
    const month = String((i % 12) + 1).padStart(2, "0");
    const year = i < 400 ? "2024" : i < 1600 ? "2025" : "2026";
    const amount = i % 2 === 0 ? "120.00" : "-49.90";
    const type = i % 2 === 0 ? "CREDIT" : "DEBIT";
    const memo = i % 2 === 0 ? `Pix recebido Cliente ${i}` : `FABWEB HOSPEDAGEM ${i}`;
    return `<STMTTRN><TRNTYPE>${type}<DTPOSTED>${year}${month}${day}<TRNAMT>${amount}<FITID>FIT-${testRunId}-${i}<MEMO>${memo}</STMTTRN>`;
  }).join("\n");
  return `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>077<ACCTID>439443873<ACCTTYPE>CHECKING</BANKACCTFROM><BANKTRANLIST><DTSTART>20241017<DTEND>20260516${transactions}</BANKTRANLIST><LEDGERBAL><BALAMT>326.05<DTASOF>20260516</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
}

const auth = () => ({ Authorization: `Bearer ${token}` });

describe.skipIf(process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_CONFIGURED !== "true")("JARVIS Home AI API", () => {
  beforeAll(async () => {
    const databaseUrl = process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL ?? "";
    await assertDisposablePostgresConnection(databaseUrl, () => prisma.$queryRaw`
      SELECT current_database() AS "database",
        current_user AS "role",
        inet_server_addr()::text AS "serverAddress",
        inet_server_port() AS "serverPort"
    `);
    testDatabaseVerified = true;
    const testUser = await prisma.user.create({
      data: {
        name: "SEC-002 Synthetic API Test User",
        email: credentials.email,
        passwordHash: await bcrypt.hash(credentials.password, 4),
        role: "admin"
      }
    });
    userId = testUser.id;
    const unrelatedFixtureUser = await prisma.user.create({
      data: {
        name: "SEC-002 Synthetic Cleanup Control",
        email: `sec002-cleanup-control-${testRunId}@example.invalid`,
        passwordHash: await bcrypt.hash("synthetic-control-password", 4)
      }
    });
    unrelatedFixtureUserId = unrelatedFixtureUser.id;
    const unrelatedMemory = await prisma.memory.create({
      data: { userId: unrelatedFixtureUserId, title: "Teste automatizado controle preservado", content: "Fixture alheio ao run", type: "note" }
    });
    unrelatedFixtureMemoryId = unrelatedMemory.id;
    const unrelatedTask = await prisma.task.create({
      data: { userId: unrelatedFixtureUserId, title: "Teste automatizado controle preservado", description: "Fixture alheio ao run" }
    });
    unrelatedFixtureTaskId = unrelatedTask.id;
    env.TOTP_ENCRYPTION_KEY = "integration-test-totp-encryption-key-only";
    const login = await request(app).post("/api/auth/login").send(credentials).expect(202).expect("Cache-Control", "no-store");
    const enrollment = await request(app).post("/api/auth/mfa/enrollment/start").send({ setupToken: login.body.setupToken }).expect(200).expect("Cache-Control", "no-store");
    adminTotpSecret = enrollment.body.secret;
    expect(enrollment.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    const active = await request(app).post("/api/auth/mfa/enrollment/confirm").send({ setupToken: login.body.setupToken, code: createTotpCode(adminTotpSecret) }).expect(200).expect("Cache-Control", "no-store");
    adminRecoveryCodes = active.body.recoveryCodes;
    expect(adminRecoveryCodes).toHaveLength(10);
    token = active.body.token;
    userId = active.body.user.id;
    const storedAdmin = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(storedAdmin.totpSecretEncrypted).toMatch(/^totp:v1:/);
    expect(storedAdmin.totpSecretEncrypted).not.toContain(adminTotpSecret);
    expect(storedAdmin.totpRecoveryCodeHashes).not.toContain(adminRecoveryCodes[0]);
  });

  afterAll(async () => {
    let unrelatedFixturesPreserved = true;
    try {
      if (testDatabaseVerified && unrelatedFixtureUserId) {
        const preservedMemory = await prisma.memory.findUnique({ where: { id: unrelatedFixtureMemoryId } });
        const preservedTask = await prisma.task.findUnique({ where: { id: unrelatedFixtureTaskId } });
        unrelatedFixturesPreserved = Boolean(preservedMemory && preservedTask);
        await prisma.user.deleteMany({ where: { id: unrelatedFixtureUserId, email: `sec002-cleanup-control-${testRunId}@example.invalid` } });
      }
      if (testDatabaseVerified && userId) {
        await prisma.user.deleteMany({ where: { id: userId, email: credentials.email } });
      }
    } finally {
      await prisma.$disconnect();
      vi.restoreAllMocks();
    }
    if (testDatabaseVerified && unrelatedFixtureUserId) {
      expect(unrelatedFixturesPreserved).toBe(true);
    }
  });

  it("authenticates the synthetic test user without exposing password data", async () => {
    const stepOne = await request(app).post("/api/auth/login").send(credentials).expect(202).expect("Cache-Control", "no-store");
    expect(stepOne.body.mfaRequired).toBe(true);
    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${stepOne.body.challengeToken}`).expect(401);
    const freshCode = createTotpCode(adminTotpSecret, Date.now() + 30_000);
    const login = await request(app).post("/api/auth/login/totp").send({ challengeToken: stepOne.body.challengeToken, code: freshCode }).expect(200).expect("Cache-Control", "no-store");
    expect(login.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(login.body)).not.toMatch(/password|passwordHash/i);

    await request(app).post("/api/auth/login/totp").send({ challengeToken: stepOne.body.challengeToken, code: freshCode }).expect(401);

    const me = await request(app).get("/api/auth/me").set(auth()).expect(200);
    expect(me.body.user.email).toBe(credentials.email);

    const recoveryChallenge = await request(app).post("/api/auth/login").send(credentials).expect(202);
    const recoveryLogin = await request(app).post("/api/auth/login/totp").send({ challengeToken: recoveryChallenge.body.challengeToken, code: adminRecoveryCodes[0] }).expect(200);
    expect(recoveryLogin.body.token).toEqual(expect.any(String));
    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`).expect(401);

    const replayChallenge = await request(app).post("/api/auth/login").send(credentials).expect(202);
    await request(app).post("/api/auth/login/totp").send({ challengeToken: replayChallenge.body.challengeToken, code: adminRecoveryCodes[0] }).expect(401);

    const beforeDisable = recoveryLogin.body.token as string;
    const disabled = await request(app).post("/api/auth/mfa/disable").set("Authorization", `Bearer ${beforeDisable}`).send({ password: credentials.password, code: adminRecoveryCodes[1] }).expect(200);
    expect(disabled.body.enabled).toBe(false);
    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${beforeDisable}`).expect(401);
    token = disabled.body.token;
    await request(app).get("/api/auth/me").set(auth()).expect(200);
    await request(app).get("/api/auth/mfa/status").set(auth()).expect(200).expect(({ body }) => {
      expect(body).toEqual({ enabled: false, recoveryCodesRemaining: 0 });
    });
    const setupAgain = await request(app).post("/api/auth/login").send(credentials).expect(202);
    expect(setupAgain.body.mfaSetupRequired).toBe(true);
  });

  it("can block demo login when production flag disables it", async () => {
    const previous = env.ALLOW_DEMO_LOGIN;
    env.ALLOW_DEMO_LOGIN = false;
    await request(app).post("/api/auth/login").send(demoCredentials).expect(403).expect((res) => {
      expect(res.body.message).toContain("demo");
    });
    env.ALLOW_DEMO_LOGIN = previous;
  });

  it("exposes the selected TTS provider header to the configured frontend", async () => {
    const response = await request(app)
      .options("/api/voice/speech")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .expect(204);
    expect(response.headers["access-control-expose-headers"]).toContain("X-Jarvis-TTS-Provider");
    expect(response.headers["access-control-expose-headers"]).toContain("X-Request-Id");
  });
  it("reports health and safe integration fallback status", async () => {
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body.app).toBe("ok");
    expect(health.body.database).toBe("ok");
    expect(health.body.openaiConfigured).toBeUndefined();
    expect(health.body.scheduler.lastError).toBeUndefined();
    expect(health.body.scheduler.lastRunAt).toBeUndefined();

    await request(app).get("/api/health/full").expect(401);
    const full = await request(app).get("/api/health/full").set(auth()).expect(200);
    expect(full.body.integrations.n8n.status).toMatch(/configured|not_configured/);
    expect(full.body.integrations.whatsapp.autoReply).toBe(false);
    expect(full.body.observability.uptimeSeconds).toEqual(expect.any(Number));
    expect(full.body.observability.logsCount).toEqual(expect.any(Number));
    expect(Array.isArray(full.body.observability.recentFailures)).toBe(true);
  });

  it("isolates detailed health logs and finance counts from other users", async () => {
    const isolationId = randomUUID();
    const userCredentials = { email: `health-scope-${isolationId}@example.invalid`, password: "synthetic-health-scope-password" };
    const adminMarker = `health-scope-admin-${isolationId}`;
    const userMarker = `health-scope-user-${isolationId}`;
    const historicalUrlSecret = `legacy-hook-${isolationId}`;
    const historicalWebhookUrl = `https://n8n.example.invalid/webhook/${historicalUrlSecret}?token=${historicalUrlSecret}`;
    const historicalLogMessage = `Legacy callback failed at ${historicalWebhookUrl}`;
    const globalEventMarker = `global-integration-event-${isolationId}`;
    const eventPathSecret = `event-path-secret-${isolationId}`;
    let scopedUserId = "";
    const integrationEventIds: string[] = [];
    const importIds: string[] = [];
    try {
      const scopedUser = await prisma.user.create({
        data: {
          name: "Health Scope Synthetic User",
          email: userCredentials.email,
          passwordHash: await bcrypt.hash(userCredentials.password, 4),
          role: "user"
        }
      });
      scopedUserId = scopedUser.id;
      const scopedLogin = await request(app).post("/api/auth/login").send(userCredentials).expect(200);

      await prisma.systemLog.createMany({
        data: [
          { userId, level: "error", module: "test", action: "health_scope", message: adminMarker },
          { userId: scopedUserId, level: "error", module: "test", action: "health_scope", message: userMarker },
          { userId: scopedUserId, level: "warning", module: "n8n", action: "historical_url", message: historicalLogMessage, metadata: { webhookUrl: historicalWebhookUrl } }
        ]
      });
      const [globalEvent, scopedEvent] = await Promise.all([
        prisma.integrationEvent.create({ data: { type: "system.alert", payloadRedacted: { marker: globalEventMarker }, lastError: `failed /webhook/${eventPathSecret}?key=private` } }),
        prisma.integrationEvent.create({ data: { userId: scopedUserId, type: "system.alert", payloadRedacted: { callback: `https://n8n.example.invalid/webhook/${eventPathSecret}?key=private` }, lastError: `failed /webhook-test/${eventPathSecret}` } })
      ]);
      integrationEventIds.push(globalEvent.id, scopedEvent.id);
      const adminImport = await prisma.statementImport.create({ data: { userId, fileName: `${isolationId}-admin.csv`, fileType: "csv", status: "uploaded" } });
      const userImport = await prisma.statementImport.create({ data: { userId: scopedUserId, fileName: `${isolationId}-user.csv`, fileType: "csv", status: "uploaded" } });
      importIds.push(adminImport.id, userImport.id);
      await prisma.statementImportRow.createMany({
        data: [
          { importId: adminImport.id, description: "Synthetic admin row", raw: {} },
          { importId: userImport.id, description: "Synthetic user row", raw: {} }
        ]
      });

      const userHealth = await request(app).get("/api/health/full").set({ Authorization: `Bearer ${scopedLogin.body.token}` }).expect(200);
      const userPayload = JSON.stringify(userHealth.body);
      expect(userPayload).toContain(userMarker);
      expect(userPayload).not.toContain(adminMarker);
      expect(userPayload).not.toContain(historicalUrlSecret);
      expect(userHealth.body.integrations.finance.pendingImports).toBe(1);
      expect(userHealth.body.integrations.finance.pendingReviewRows).toBe(1);
      expect(userHealth.body.observability.http).toBeNull();
      expect(userHealth.body.scheduler.lastError).toBeNull();

      const integrationStatus = await request(app).get("/api/integrations/status").set({ Authorization: `Bearer ${scopedLogin.body.token}` }).expect(200);
      const integrationStatusText = JSON.stringify(integrationStatus.body);
      expect(Object.values(integrationStatus.body.urls).every((value: unknown) => value === "")).toBe(true);
      expect(integrationStatus.body.providers.api_public.url).toBeUndefined();
      expect(integrationStatus.body.providers.whatsapp.webhookUrl).toBeUndefined();
      expect(integrationStatus.body.providers.n8n.webhookUrl).toBe("");
      expect(integrationStatus.body.providers.home_assistant.tokenMasked).toBe("");
      expect(integrationStatusText).not.toContain("apijarvis.juninnzxtec.com.br");
      expect(integrationStatusText).not.toContain("n8njarvis.juninnzxtec.com.br");
      expect(integrationStatus.body.providers.n8n).toMatchObject({ configured: null, status: "unknown" });
      expect(integrationStatus.body.providers.whatsapp).toMatchObject({ configured: null, status: "unknown", apiUrlConfigured: null, apiKeyConfigured: null });
      expect(integrationStatus.body.providers.home_assistant).toMatchObject({ configured: null, status: "unknown", tokenConfigured: null });
      expect(integrationStatusText).not.toContain('"source":"env"');

      const [n8nStatus, whatsappStatus, homeAssistantStatus] = await Promise.all([
        request(app).get("/api/n8n/status").set({ Authorization: `Bearer ${scopedLogin.body.token}` }),
        request(app).get("/api/whatsapp/status").set({ Authorization: `Bearer ${scopedLogin.body.token}` }),
        request(app).get("/api/home-assistant/status").set({ Authorization: `Bearer ${scopedLogin.body.token}` })
      ]);
      expect(n8nStatus.body).toMatchObject({ configured: null, status: "unknown", webhookConfigured: null, apiKeyConfigured: null });
      expect(whatsappStatus.body).toMatchObject({ configured: null, status: "unknown", apiUrlConfigured: null, apiKeyConfigured: null, instanceConfigured: null });
      expect(homeAssistantStatus.body).toMatchObject({ configured: null, status: "unknown", urlConfigured: null, tokenConfigured: null });

      const userEvents = await request(app).get("/api/integrations/events").set({ Authorization: `Bearer ${scopedLogin.body.token}` }).expect(200);
      expect(JSON.stringify(userEvents.body)).not.toContain(globalEventMarker);
      expect(JSON.stringify(userEvents.body)).not.toContain(eventPathSecret);
      expect(userEvents.body.events).toHaveLength(1);
      const adminEvents = await request(app).get("/api/integrations/events").set(auth()).expect(200);
      expect(JSON.stringify(adminEvents.body)).toContain(globalEventMarker);
      expect(JSON.stringify(adminEvents.body)).not.toContain(eventPathSecret);

      const commandHealth = await request(app).post("/api/commands/run")
        .set({ Authorization: `Bearer ${scopedLogin.body.token}` })
        .send({ phrase: "status do sistema" }).expect(200);
      const commandHealthText = JSON.stringify(commandHealth.body);
      expect(commandHealth.body.result.intent).toBe("health.check");
      expect(commandHealthText).not.toContain("apijarvis.juninnzxtec.com.br");
      expect(commandHealthText).not.toContain("n8njarvis.juninnzxtec.com.br");
      expect(commandHealthText).not.toMatch(/apiKeyMasked|tokenMasked|webhookUrl|fullHealthUrl/);
      expect(userHealth.body.scheduler.lastRunAt).toBeNull();
      expect(JSON.stringify(userHealth.body.integrations)).not.toMatch(/webhookUrl|apiKeyMasked|apiUrl|instance|publicHealthUrl|fullHealthUrl/);

      const userReport = await request(app).get("/api/reports/system").set({ Authorization: `Bearer ${scopedLogin.body.token}` }).expect(200);
      const userReportPayload = JSON.stringify(userReport.body);
      expect(userReportPayload).toContain(userMarker);
      expect(userReportPayload).not.toContain(adminMarker);
      expect(userReportPayload).not.toContain(historicalUrlSecret);
      expect(JSON.stringify(userReport.body.health.integrations)).not.toMatch(/webhookUrl|apiKeyMasked|apiUrl|instance|publicHealthUrl|fullHealthUrl/);

      const userLogs = await request(app).get("/api/logs?module=n8n").set({ Authorization: `Bearer ${scopedLogin.body.token}` }).expect(200);
      expect(JSON.stringify(userLogs.body)).not.toContain(historicalUrlSecret);
      expect(JSON.stringify(userLogs.body)).toContain("[REDACTED_URL]");
      const integrationLogs = await request(app).get("/api/integrations/logs").set({ Authorization: `Bearer ${scopedLogin.body.token}` }).expect(200);
      expect(JSON.stringify(integrationLogs.body)).not.toContain(historicalUrlSecret);

      const adminHealth = await request(app).get("/api/health/full").set(auth()).expect(200);
      const adminPayload = JSON.stringify(adminHealth.body);
      expect(adminPayload).toContain(adminMarker);
      expect(adminPayload).toContain(userMarker);
      expect(adminHealth.body.integrations.finance.pendingImports).toBeGreaterThanOrEqual(2);
      expect(adminHealth.body.integrations.finance.pendingReviewRows).toBeGreaterThanOrEqual(2);
    } finally {
      await prisma.statementImportRow.deleteMany({ where: { importId: { in: importIds } } });
      await prisma.statementImport.deleteMany({ where: { id: { in: importIds } } });
      await prisma.integrationEvent.deleteMany({ where: { id: { in: integrationEventIds } } });
      await prisma.systemLog.deleteMany({ where: { message: { in: [adminMarker, userMarker, historicalLogMessage] } } });
      if (scopedUserId) await prisma.user.deleteMany({ where: { id: scopedUserId, email: userCredentials.email } });
    }
  });

  it("persists chat conversations and messages", async () => {
    const chat = await request(app)
      .post("/api/chat/send")
      .set(auth())
      .send({ content: "Olá Jarvis, qual o status do sistema?" })
      .expect(200);

    expect(chat.body.reply).toContain("Status do sistema");
    expect(chat.body.conversation.id).toEqual(expect.any(String));

    const detail = await request(app).get(`/api/chat/conversations/${chat.body.conversation.id}`).set(auth()).expect(200);
    expect(detail.body.conversation.messages.length).toBeGreaterThanOrEqual(2);
  });

  it("processes voice commands with the original JARVIS BR Premium persona", async () => {
    const empty = await request(app).post("/api/voice/process").set(auth()).send({ text: "   " }).expect(400);
    expect(empty.body.message).toBe("Dados invalidos");

    const voice = await request(app).post("/api/voice/process").set(auth()).send({ text: "status do sistema" }).expect(200);
    expect(voice.body.voicePersona).toBe("JARVIS BR Premium");
    expect(voice.body.reply).toEqual(expect.any(String));
    expect(voice.body.reply.length).toBeGreaterThan(10);
    expect(JSON.stringify(voice.body)).not.toMatch(/audio|base64|blob/i);
  });

  it("routes complex questions through the Super Intelligence Brain safely", async () => {
    const status = await request(app).get("/api/brain/status").set(auth()).expect(200);
    expect(status.body.status).toBe("ready");
    expect(status.body.agents).toBeGreaterThanOrEqual(12);

    const agents = await request(app).get("/api/brain/agents").set(auth()).expect(200);
    expect(agents.body.agents.some((agent: { name: string }) => agent.name === "FinanceAgent")).toBe(true);

    const tools = await request(app).get("/api/brain/tools").set(auth()).expect(200);
    expect(tools.body.tools.some((tool: { name: string }) => tool.name === "summarizeFinance")).toBe(true);
    expect(tools.body.tools.some((tool: { name: string }) => tool.name === "getWebhookUrl")).toBe(false);

    const whatsappPlan = await request(app)
      .post("/api/brain/plan")
      .set(auth())
      .send({ message: "configurar webhook do WhatsApp", allowExternalAI: false, allowTools: true })
      .expect(200);
    expect(whatsappPlan.body.plannedTools).not.toContain("getWebhookUrl");
    expect(JSON.stringify(whatsappPlan.body)).not.toContain("apijarvis.juninnzxtec.com.br/api/whatsapp/webhook");

    const whatsappGuidance = await request(app)
      .post("/api/brain/ask")
      .set(auth())
      .send({ message: "configurar webhook do WhatsApp", allowExternalAI: false, allowTools: true })
      .expect(200);
    expect(JSON.stringify(whatsappGuidance.body)).not.toContain("apijarvis.juninnzxtec.com.br/api/whatsapp/webhook");

    const memory = await prisma.memory.create({
      data: {
        userId,
        type: "fact",
        title: testTitle("Brain memoria"),
        content: "Junior trabalha no JARVIS Home AI e gosta de respostas objetivas.",
        tags: ["brain", "jarvis"],
        importance: 5
      }
    });

    const ask = await request(app)
      .post("/api/brain/ask")
      .set(auth())
      .send({ message: "Jarvis, o que voce sabe sobre mim?", mode: "deep", allowExternalAI: false, allowTools: true })
      .expect(200);
    expect(ask.body.agent).toBe("PersonalMemoryAgent");
    expect(ask.body.intent).toBe("memory.query");
    expect(ask.body.answer).toContain(testTitle("Brain memoria"));
    expect(JSON.stringify(ask.body)).not.toMatch(/sk-|AIza|Bearer\s+|password/i);

    const plan = await request(app)
      .post("/api/brain/plan")
      .set(auth())
      .send({ message: "quanto entrou esse mes?", mode: "normal", allowExternalAI: false, allowTools: true })
      .expect(200);
    expect(plan.body.agent).toBe("FinanceAgent");
    expect(plan.body.plannedTools).toContain("summarizeFinance");

    const draft = await request(app).post("/api/brain/execute-draft").set(auth()).send({ draftAction: { type: "home.action", entity: "lock.front_door" } }).expect(200);
    expect(draft.body.status).toBe("confirmation_required");

    const memoryTitle = "memória de regressão não persistida";
    const memoryBefore = await prisma.memory.count({ where: { userId, title: memoryTitle } });
    const memoryDraft = await request(app)
      .post("/api/brain/ask")
      .set(auth())
      .send({ message: `lembre que ${memoryTitle}`, allowExternalAI: false, allowTools: false })
      .expect(200);
    expect(memoryDraft.body.needsConfirmation).toBe(true);
    expect(memoryDraft.body.usedTools).toContainEqual(expect.objectContaining({ tool: "createMemory", status: "confirmation_required" }));
    expect(await prisma.memory.count({ where: { userId, title: memoryTitle } })).toBe(memoryBefore);

    const taskTitle = "tarefa de regressão não persistida";
    const taskBefore = await prisma.task.count({ where: { userId, title: taskTitle } });
    const taskDraft = await request(app)
      .post("/api/brain/ask")
      .set(auth())
      .send({ message: `crie uma tarefa ${taskTitle}`, allowExternalAI: false, allowTools: false })
      .expect(200);
    expect(taskDraft.body.needsConfirmation).toBe(true);
    expect(taskDraft.body.usedTools).toContainEqual(expect.objectContaining({ tool: "createTask", status: "confirmation_required" }));
    expect(await prisma.task.count({ where: { userId, title: taskTitle } })).toBe(taskBefore);

    await request(app).post("/api/brain/execute-draft").set(auth()).send({ unexpected: true }).expect(400);
    await request(app).post("/api/brain/execute-draft").set(auth()).send({ draftAction: {} }).expect(400);

    const feedback = await request(app).post("/api/brain/feedback").set(auth()).send({ message: "prefiro respostas curtas e praticas", savePreference: true }).expect(201);
    expect(feedback.body.status).toBe("success");

    await prisma.memory.deleteMany({ where: { id: memory.id } });
    if (feedback.body.memoryId) await prisma.memory.deleteMany({ where: { id: feedback.body.memoryId } });
  });

  it("supports memory CRUD and memory creation through chat intent", async () => {
    const created = await request(app)
      .post("/api/memories")
      .set(auth())
      .send({ title: testTitle("memória"), content: "Conteúdo de teste", type: "note", tags: ["test"], importance: 3 })
      .expect(201);

    await request(app)
      .put(`/api/memories/${created.body.memory.id}`)
      .set(auth())
      .send({ title: testTitle("memória editada"), content: "Editado", type: "note", tags: ["test"], importance: 4 })
      .expect(200);

    const chat = await request(app)
      .post("/api/chat/send")
      .set(auth())
      .send({ content: "lembre que eu gosto de automações com n8n" })
      .expect(200);
    expect(chat.body.intent).toBe("memory.create");

    const list = await request(app).get("/api/memories?q=n8n").set(auth()).expect(200);
    expect(chat.body.needsConfirmation).toBe(true);
    expect(chat.body.usedTools).toEqual(expect.arrayContaining([
      expect.objectContaining({ tool: "createMemory", status: "confirmation_required" })
    ]));
    expect(list.body.memories).toHaveLength(0);

    await request(app).delete(`/api/memories/${created.body.memory.id}`).set(auth()).expect(204);
  });

  it("supports task CRUD and task creation through chat intent", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set(auth())
      .send({ title: testTitle("tarefa"), description: "Teste", priority: "high", status: "pending" })
      .expect(201);

    await request(app)
      .put(`/api/tasks/${created.body.task.id}`)
      .set(auth())
      .send({ title: testTitle("tarefa editada"), description: "Editado", priority: "urgent", status: "in_progress" })
      .expect(200);

    const done = await request(app).patch(`/api/tasks/${created.body.task.id}/status`).set(auth()).send({ status: "done" }).expect(200);
    expect(done.body.task.status).toBe("done");

    const chat = await request(app)
      .post("/api/chat/send")
      .set(auth())
      .send({ content: "crie uma tarefa para testar o sistema amanhã às 9h" })
      .expect(200);
    expect(chat.body.intent).toBe("task.create");

    await request(app).delete(`/api/tasks/${created.body.task.id}`).set(auth()).expect(204);
  });

  it("runs safe automations, writes logs, and blocks dangerous actions", async () => {
    const created = await request(app)
      .post("/api/automations")
      .set(auth())
      .send({ name: testTitle("automação"), triggerType: "manual", actionType: "internal", enabled: true, config: { action: "test" } })
      .expect(201);
    const automationId = created.body.automation.id;

    const run = await request(app).post(`/api/automations/${automationId}/run`).set(auth()).send({ input: "test" }).expect(200);
    expect(run.body.log.status).toBe("success");

    const logs = await request(app).get(`/api/automations/${automationId}/logs`).set(auth()).expect(200);
    expect(logs.body.logs.length).toBeGreaterThan(0);

    await request(app)
      .post("/api/automations")
      .set(auth())
      .send({ name: testTitle("perigoso"), triggerType: "manual", actionType: "internal", enabled: true, config: { cmd: "rm -rf /" } })
      .expect(400);
  });

  it("returns friendly fallback responses for disabled integrations", async () => {
    await request(app).get("/api/n8n/status").set(auth()).expect(200).expect((res) => {
      expect(res.body.configured).toBe(false);
    });
    await request(app).post("/api/n8n/trigger").set(auth()).send({ test: true }).expect(200).expect((res) => {
      expect(res.body.status).toBe("not_configured");
    });
    await request(app).get("/api/whatsapp/status").set(auth()).expect(200).expect((res) => {
      expect(res.body.autoReply).toBe(false);
    });
    await request(app).post("/api/whatsapp/send").set(auth()).send({ phone: "5511999999999", content: "teste", confirmed: true }).expect(200).expect((res) => {
      expect(res.body.status).toBe("not_configured");
    });
    await request(app).get("/api/home-assistant/status").set(auth()).expect(200).expect((res) => {
      expect(res.body.configured).toBe(false);
    });
    await request(app).get("/api/home-assistant/entities").set(auth()).expect(200).expect((res) => {
      expect(res.body.status).toBe("not_configured");
    });
  });

  it("configures finance integration, parses transactions, and masks tokens", async () => {
    const fallback = await request(app).get("/api/finance/status").set(auth()).expect(200);
    expect(fallback.body.status).toMatch(/configured|not_configured/);

    const saved = await request(app)
      .put("/api/finance/config")
      .set(auth())
      .send({ apiUrl: "https://controlefinanceiro.test", token: "fake-finance-token" })
      .expect(200);
    expect(saved.body.status).toBe("configured");
    expect(JSON.stringify(saved.body)).not.toContain("fake-finance-token");

    vi.mocked(axios.request).mockResolvedValueOnce({ status: 200, data: { data: { id: "u1", name: "Finance Admin" } } });
    const test = await request(app).post("/api/finance/test-connection").set(auth()).expect(200);
    expect(test.body.status).toBe("success");

    const parsed = await request(app)
      .post("/api/finance/parse")
      .set(auth())
      .send({ text: "entrada pix recebido R$ 120,00 cliente teste" })
      .expect(200);
    expect(parsed.body.parsed.type).toBe("income");
    expect(parsed.body.parsed.amount).toBe(120);

    vi.mocked(axios.request)
      .mockResolvedValueOnce({ status: 200, data: { data: [{ id: "acc-inter", name: "PJ DO INTER" }] } })
      .mockResolvedValueOnce({ status: 201, data: { data: { id: "t1" } } });
    const created = await request(app)
      .post("/api/finance/transactions")
      .set(auth())
      .send({ type: "income", status: "received", description: testTitle("financeiro"), amount: 120, transaction_date: "2026-05-14", payment_method: "pix" })
      .expect(200);
    expect(created.body.status).toBe("success");

    const cleared = await request(app).delete("/api/finance/config").set(auth()).expect(200);
    expect(cleared.body.status).toBe("not_configured");

    vi.mocked(axios.request)
      .mockResolvedValueOnce({ status: 200, data: { data: { requires_2fa: true, challenge_token: "temporary-finance-challenge-token" } } })
      .mockResolvedValueOnce({ status: 200, data: { data: { token: "fake-finance-token-after-2fa", user: { email: "finance@example.com" } } } })
      .mockResolvedValueOnce({ status: 200, data: { data: [{ id: "acc-primary", name: "PJ DO INTER" }] } });
    const login = await request(app)
      .post("/api/finance/auth/login")
      .set(auth())
      .send({ apiUrl: "https://controlefinanceiro.test", email: "finance@example.com", password: "fake-password" })
      .expect(200);
    expect(login.body.status).toBe("requires_2fa");
    expect(login.body.challengeToken).toBe("temporary-finance-challenge-token");

    const linked = await request(app)
      .post("/api/finance/auth/challenge")
      .set(auth())
      .send({ apiUrl: "https://controlefinanceiro.test", email: "finance@example.com", challengeToken: login.body.challengeToken, code: "123456" })
      .expect(200);
    expect(linked.body.status).toBe("configured");
    expect(JSON.stringify(linked.body)).not.toContain("fake-finance-token-after-2fa");

    vi.mocked(axios.request).mockResolvedValueOnce({ status: 200, data: { data: { id: "finance-user", email: "finance@example.com" } } });
    const connected = await request(app).post("/api/finance/test-connection").set(auth()).expect(200);
    expect(connected.body.status).toBe("success");

    await request(app).delete("/api/finance/auth").set(auth()).expect(200);
  });

  it("uses OpenAI fallback safely when the provider returns quota errors", async () => {
    openAiService.setClientForTests({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error("429 quota exceeded"))
        }
      }
    } as never);

    const reply = await openAiService.complete([{ role: "user", content: "teste" }]);
    expect(reply).toContain("modo seguro local");
    expect(openAiService.status().status).toBe("quota_exceeded");
    openAiService.setClientForTests(null);
  });

  it("classifies OpenAI model and key failures without exposing details", async () => {
    openAiService.setClientForTests({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValueOnce(new Error("404 model_not_found"))
        }
      }
    } as never);
    await openAiService.complete([{ role: "user", content: "teste modelo" }]);
    expect(openAiService.status()).toMatchObject({ status: "model_not_found", lastError: "[REDACTED_DETAIL]" });

    openAiService.setClientForTests({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValueOnce(Object.assign(new Error("invalid api key"), { status: 401 }))
        }
      }
    } as never);
    await openAiService.complete([{ role: "user", content: "teste chave" }]);
    expect(openAiService.status()).toMatchObject({ status: "invalid_key", lastError: "[REDACTED_DETAIL]" });
    openAiService.setClientForTests(null);
  });

  it("classifies Gemini quota, model and key failures while keeping local fallback", async () => {
    vi.mocked(axios.post).mockRejectedValueOnce({ response: { status: 429, data: { error: { status: "RESOURCE_EXHAUSTED" } } } });
    const quotaReply = await geminiService.complete([{ role: "user", content: "teste quota gemini" }]);
    expect(quotaReply).toBeNull();
    expect(geminiService.status().status).toBe("quota_exceeded");

    vi.mocked(axios.post).mockRejectedValueOnce({ response: { status: 404, data: { error: { message: "model not found" } } } });
    await geminiService.complete([{ role: "user", content: "teste modelo gemini" }]);
    expect(geminiService.status().status).toBe("model_not_found");

    vi.mocked(axios.post).mockRejectedValueOnce({ response: { status: 403, data: { error: { status: "API_KEY_INVALID" } } } });
    await geminiService.complete([{ role: "user", content: "teste chave gemini" }]);
    expect(geminiService.status().status).toBe("invalid_key");
  });

  it("uses Gemini when OpenAI fails and Gemini is configured", async () => {
    openAiService.setClientForTests({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error("429 quota exceeded"))
        }
      }
    } as never);
    vi.mocked(axios.post).mockResolvedValueOnce({
      status: 200,
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: "Resposta via Gemini fallback." }]
            }
          }
        ]
      }
    });

    const reply = await openAiService.complete([{ role: "user", content: "teste fallback gemini" }]);
    expect(reply).toContain("Gemini fallback");
    expect(openAiService.status().fallbackProvider).toBe("gemini");
    openAiService.setClientForTests(null);
  });

  it("configures and tests n8n webhook with redacted logs through a mocked HTTP call", async () => {
    const saved = await request(app)
      .put("/api/n8n/config")
      .set(auth())
      .send({ webhookUrl: "https://n8n.test/webhook/jarvis", apiKey: "secret-n8n-token" })
      .expect(200);
    expect(saved.body.status).toBe("configured");
    expect(JSON.stringify(saved.body)).not.toContain("secret-n8n-token");
    const stored = await prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId, key: "n8n_api_key" } } });
    expect(String(stored.value)).toMatch(/^enc:v[12]:/);
    expect(String(stored.value)).not.toContain("secret-n8n-token");

    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { ok: true, token: "secret-token" } });

    const res = await request(app).post("/api/n8n/test").set(auth()).send({ ignored: true }).expect(200);
    expect(res.body.status).toBe("success");

    const logs = await request(app).get("/api/logs?module=n8n").set(auth()).expect(200);
    expect(JSON.stringify(logs.body)).not.toContain("secret-token");
    const settings = await request(app).get("/api/settings").set(auth()).expect(200);
    expect(JSON.stringify(settings.body)).not.toContain("secret-n8n-token");

    const cleared = await request(app).delete("/api/n8n/config").set(auth()).expect(200);
    expect(cleared.body.status).toBe("not_configured");
  });

  it("persists only the authenticated user's IANA timezone and rejects invalid zones", async () => {
    const defaultProfile = await request(app).get("/api/settings/profile").set(auth()).expect(200);
    expect(defaultProfile.body.profile.timezone).toBe("America/Sao_Paulo");
    const savedProfile = await request(app).patch("/api/settings/profile/timezone").set(auth()).send({ timezone: "Europe/Lisbon" }).expect(200);
    expect(savedProfile.body.profile.timezone).toBe("Europe/Lisbon");
    await request(app).patch("/api/settings/profile/timezone").set(auth()).send({ timezone: "Mars/Olympus" }).expect(400);
    await request(app).patch("/api/settings/profile/timezone").set(auth()).send({ timezone: "UTC", extra: true }).expect(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })).timezone).toBe("Europe/Lisbon");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: unrelatedFixtureUserId }, select: { timezone: true } })).timezone).toBe("America/Sao_Paulo");
  });

  it("validates WhatsApp phone numbers and sends through a mocked Evolution API", async () => {
    await request(app).post("/api/whatsapp/send").set(auth()).send({ phone: "abc", content: "teste", confirmed: true }).expect(400);

    const saved = await request(app)
      .put("/api/whatsapp/config")
      .set(auth())
      .send({ apiUrl: "https://evolution.test", apiKey: "secret-key", instance: "jarvis-test", autoReply: false })
      .expect(200);
    expect(saved.body.status).toBe("configured");
    expect(JSON.stringify(saved.body)).not.toContain("secret-key");

    vi.mocked(axios.get)
      .mockResolvedValueOnce({ status: 200, data: { instance: { state: "open" } } })
      .mockResolvedValueOnce({ status: 200, data: { instance: { state: "close" } } });
    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { ok: true, apikey: "secret-key" } });

    const test = await request(app).post("/api/whatsapp/test-connection").set(auth()).expect(200);
    expect(test.body).toMatchObject({ status: "connected", connectionState: "connected", reachable: true });

    const disconnected = await request(app).post("/api/whatsapp/test-connection").set(auth()).expect(200);
    expect(disconnected.body).toMatchObject({ status: "disconnected", connectionState: "disconnected", reachable: true });
    expect(disconnected.body.message).toMatch(/sessão.*desconectada/i);

    const send = await request(app).post("/api/whatsapp/send").set(auth()).send({ phone: "5511999999999", content: "teste", confirmed: true }).expect(200);
    expect(send.body.status).toBe("success");

    const cleared = await request(app).delete("/api/whatsapp/config").set(auth()).expect(200);
    expect(cleared.body.status).toBe("not_configured");
  });

  it("manages Evolution QR connection safely from the WhatsApp panel", async () => {
    await request(app).delete("/api/whatsapp/config").set(auth()).expect(200);

    const notConfigured = await request(app).post("/api/whatsapp/evolution/connect").set(auth()).send({ instanceName: "jarvis-test" }).expect(200);
    expect(notConfigured.body.status).toBe("not_configured");

    const saved = await request(app)
      .put("/api/whatsapp/config")
      .set(auth())
      .send({ apiUrl: "https://evolution.test", apiKey: "secret-evolution-key", instance: "jarvis-test", autoReply: false })
      .expect(200);
    expect(JSON.stringify(saved.body)).not.toContain("secret-evolution-key");

    vi.mocked(axios.request).mockResolvedValueOnce({ status: 200, data: { qrcode: "data:image/png;base64,AAAA" } });
    const connect = await request(app).post("/api/whatsapp/evolution/connect").set(auth()).send({ instanceName: "jarvis-test" }).expect(200);
    expect(connect.body.status).toBe("success");
    expect(connect.body.qrCodeDataUrl).toContain("data:image/png;base64");
    expect(JSON.stringify(connect.body)).not.toContain("secret-evolution-key");

    vi.mocked(axios.request).mockResolvedValueOnce({ status: 200, data: { instance: { state: "open" } } });
    const state = await request(app).get("/api/whatsapp/evolution/connection-state?instanceName=jarvis-test").set(auth()).expect(200);
    expect(state.body.connectionState).toBe("connected");

    vi.mocked(axios.request).mockResolvedValueOnce({ status: 201, data: { ok: true, apikey: "secret-evolution-key" } });
    const webhook = await request(app).post("/api/whatsapp/evolution/configure-webhook").set(auth()).send({ instanceName: "jarvis-test" }).expect(200);
    expect(webhook.body.status).toBe("success");
    expect(JSON.stringify(webhook.body)).not.toContain("secret-evolution-key");

    vi.mocked(axios.request)
      .mockResolvedValueOnce({ status: 200, data: { ok: true } })
      .mockResolvedValueOnce({ status: 200, data: { ok: true } });
    const reset = await request(app)
      .post("/api/whatsapp/evolution/reset")
      .set(auth())
      .send({ instanceName: "jarvis-test", confirmation: "RESETAR EVOLUTION" })
      .expect(200);
    expect(reset.body.status).toBe("success");
    expect(JSON.stringify(reset.body)).not.toContain("secret-evolution-key");

    await request(app)
      .post("/api/whatsapp/evolution/reset")
      .set(auth())
      .send({ instanceName: "jarvis-test", confirmation: "resetar" })
      .expect(400);

    vi.mocked(axios.request).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    vi.mocked(axios.request).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    vi.mocked(axios.request).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    const manual = await request(app).post("/api/whatsapp/evolution/configure-webhook").set(auth()).send({ instanceName: "jarvis-test" }).expect(200);
    expect(manual.body.status).toBe("manual_action_required");
    expect(manual.body.checklist.length).toBeGreaterThan(0);

    await request(app).delete("/api/whatsapp/config").set(auth()).expect(200);
  });

  it("normalizes Evolution QR and connection state formats", async () => {
    await expect(normalizeQrResponse({ qrcode: "data:image/png;base64,AAAA" })).resolves.toMatchObject({ rawType: "data_url", canRenderQr: true });
    await expect(normalizeQrResponse({ base64: Buffer.from("fake-image").toString("base64").repeat(20) })).resolves.toMatchObject({ rawType: "base64", canRenderQr: true });
    await expect(normalizeQrResponse({ code: "2@temporary-whatsapp-qr-code" })).resolves.toMatchObject({ rawType: "code", canRenderQr: true });
    await expect(normalizeQrResponse({ pairingCode: "12345678" })).resolves.toMatchObject({ rawType: "pairing_code", pairingCode: "12345678", canRenderQr: false });
    expect(normalizeConnectionState({ instance: { state: "open" } }).connectionState).toBe("connected");
    expect(normalizeConnectionState({ state: "close" }).connectionState).toBe("disconnected");
  });

  it("groups mocked Home Assistant entities and blocks sensitive actions without confirmation", async () => {
    const previous = homeAssistantService.configured;
    homeAssistantService.configured = true;
    vi.mocked(axios.get).mockResolvedValueOnce({
      status: 200,
      data: [
        { entity_id: "light.sala", state: "on", attributes: { friendly_name: "Luz da sala" } },
        { entity_id: "sensor.temperatura", state: "24", attributes: { friendly_name: "Temperatura" } }
      ]
    });

    const entities = await request(app).get("/api/home-assistant/entities").set(auth()).expect(200);
    expect(entities.body.grouped.light.length).toBe(1);
    expect(entities.body.grouped.sensor.length).toBe(1);

    const sensitive = await request(app)
      .post("/api/home-assistant/call-service")
      .set(auth())
      .send({ domain: "cover", service: "open_cover", data: { entity_id: "cover.garagem" } })
      .expect(200);
    expect(sensitive.body.status).toBe("confirmation_required");

    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: [{ ok: true }] });
    const light = await request(app).post("/api/home-assistant/light").set(auth()).send({ entityId: "light.sala", action: "turn_on" }).expect(200);
    expect(light.body.status).toBe("success");
    homeAssistantService.configured = previous;
  });

  it("redacts sensitive metadata persisted in system logs", async () => {
    await writeSystemLog({
      userId,
      module: "security-test",
      action: "redact",
      message: "Teste de redaction",
      metadata: { apiKey: "secret-api-key", headers: { authorization: "Bearer secret-token", cookie: "session=secret" }, nested: { password: "123456" } }
    });

    const logs = await request(app).get("/api/logs?module=security-test").set(auth()).expect(200);
    const payload = JSON.stringify(logs.body);
    expect(payload).toContain("[REDACTED]");
    expect(payload).not.toContain("secret-api-key");
    expect(payload).not.toContain("secret-token");
    expect(payload).not.toContain("123456");
  });

  it("lists and runs command center commands", async () => {
    const list = await request(app).get("/api/commands").set(auth()).expect(200);
    expect(list.body.commands.length).toBeGreaterThanOrEqual(10);
    const run = await request(app).post("/api/commands/run").set(auth()).send({ phrase: "gerar relatório de pendências" }).expect(200);
    expect(run.body.intent).toBe("report.tasks");
  });

  it("supports routines CRUD and run history for an isolated user", async () => {
    await prisma.routine.createMany({
      data: Array.from({ length: 4 }, (_, index) => ({
        userId,
        name: `SEC002 routine fixture ${testRunId} ${index}`,
        description: "Synthetic API integration fixture",
        triggerType: "manual" as const,
        enabled: false,
        config: { report: "tasks" }
      }))
    });
    const seed = await request(app).get("/api/routines").set(auth()).expect(200);
    expect(seed.body.routines.length).toBeGreaterThanOrEqual(4);
    const created = await request(app)
      .post("/api/routines")
      .set(auth())
      .send({ name: testTitle("rotina"), description: "Rotina de teste", triggerType: "manual", enabled: true, config: { report: "tasks" } })
      .expect(201);
    const routineId = created.body.routine.id;
    const run = await request(app).post(`/api/routines/${routineId}/run`).set(auth()).send({ source: "test" }).expect(200);
    expect(run.body.run.status).toBe("success");
    const runs = await request(app).get(`/api/routines/${routineId}/runs`).set(auth()).expect(200);
    expect(runs.body.runs.length).toBeGreaterThan(0);
  });

  it("generates intelligent reports", async () => {
    await request(app).get("/api/reports/daily-summary").set(auth()).expect(200).expect((res) => {
      expect(res.body.recommendations.length).toBeGreaterThan(0);
    });
    await request(app).get("/api/reports/tasks").set(auth()).expect(200).expect((res) => {
      expect(Array.isArray(res.body.open)).toBe(true);
    });
    await request(app).get("/api/reports/system").set(auth()).expect(200).expect((res) => {
      expect(res.body.health.database).toBe("ok");
    });
    await request(app).get("/api/reports/activity").set(auth()).expect(200).expect((res) => {
      expect(Array.isArray(res.body.logs)).toBe(true);
    });
  });

  it("supports notifications and read state", async () => {
    const notification = await prisma.notification.create({ data: { userId, title: testTitle("notificacao"), message: "Aviso seguro", type: "info" } });
    const notificationId = notification.id;
    const list = await request(app).get("/api/notifications").set(auth()).expect(200);
    expect(list.body.notifications.some((item: { id: string }) => item.id === notificationId)).toBe(true);
    const read = await request(app).patch(`/api/notifications/${notificationId}/read`).set(auth()).expect(200);
    expect(read.body.notification.readAt).toEqual(expect.any(String));
    await request(app).patch("/api/notifications/read-all").set(auth()).expect(200);
  });

  it("supports reminderAt, today and overdue task filters", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();
    const created = await request(app)
      .post("/api/tasks")
      .set(auth())
      .send({ title: testTitle("lembrete"), dueDate: yesterday, reminderAt: today, priority: "high" })
      .expect(201);
    expect(created.body.task.reminderAt).toEqual(expect.any(String));
    const overdue = await request(app).get("/api/tasks?overdue=true").set(auth()).expect(200);
    expect(overdue.body.tasks.some((item: { id: string }) => item.id === created.body.task.id)).toBe(true);
    await request(app).get("/api/tasks/pending-overdue").set(auth()).expect(200);
    await request(app).delete(`/api/tasks/${created.body.task.id}`).set(auth()).expect(204);
  });

  it("keeps scheduler disabled when configured off", async () => {
    const previous = env.SCHEDULER_ENABLED;
    env.SCHEDULER_ENABLED = false;
    const result = await schedulerService.runOnce();
    expect(result).toMatchObject({ skipped: true, reason: "disabled" });
    env.SCHEDULER_ENABLED = previous;
  });

  it("executes safe scheduled routines once and creates run, notification and log", async () => {
    const previous = env.SCHEDULER_ENABLED;
    env.SCHEDULER_ENABLED = true;
    const routine = await prisma.routine.create({
      data: {
        userId,
        name: testTitle("rotina scheduler"),
        description: "Scheduler seguro",
        triggerType: "schedule",
        enabled: true,
        config: { report: "tasks", schedule: { type: "interval_minutes", minutes: 1 } }
      }
    });

    const result = await schedulerService.runOnce(new Date());
    expect(result).toMatchObject({ skipped: false });

    const runs = await prisma.routineRun.findMany({ where: { routineId: routine.id } });
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("success");

    const notifications = await prisma.notification.findMany({ where: { userId, title: "Rotina agendada executada" } });
    expect(notifications.length).toBeGreaterThan(0);

    await schedulerService.runOnce(new Date());
    const runsAfterDuplicateAttempt = await prisma.routineRun.count({ where: { routineId: routine.id } });
    expect(runsAfterDuplicateAttempt).toBe(1);
    env.SCHEDULER_ENABLED = previous;
  });

  it("creates task reminder notifications without duplicating them", async () => {
    const previous = env.SCHEDULER_ENABLED;
    env.SCHEDULER_ENABLED = true;
    const title = testTitle(`reminder scheduler ${Date.now()}`);
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        priority: "urgent",
        reminderAt: new Date(Date.now() - 60_000)
      }
    });

    await schedulerService.runOnce(new Date());
    await schedulerService.runOnce(new Date(Date.now() + 60_000));

    const updated = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.reminderSentAt).toBeTruthy();
    const notifications = await prisma.notification.findMany({ where: { userId, message: { contains: title } } });
    expect(notifications.length).toBe(1);
    env.SCHEDULER_ENABLED = previous;
  });

  it("creates overdue task summary without duplicating alerts", async () => {
    const previous = env.SCHEDULER_ENABLED;
    env.SCHEDULER_ENABLED = true;
    const title = testTitle(`overdue scheduler ${Date.now()}`);
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        priority: "high",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    });

    await schedulerService.runOnce(new Date());
    await schedulerService.runOnce(new Date(Date.now() + 60_000));

    const updated = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(updated.overdueNotifiedAt).toBeTruthy();
    const notifications = await prisma.notification.findMany({ where: { userId, message: { contains: title } } });
    expect(notifications.length).toBe(1);
    env.SCHEDULER_ENABLED = previous;
  });

  it("blocks sensitive scheduled routine actions and redacts logs", async () => {
    const previous = env.SCHEDULER_ENABLED;
    env.SCHEDULER_ENABLED = true;
    const routine = await prisma.routine.create({
      data: {
        userId,
        name: testTitle("rotina sensivel scheduler"),
        triggerType: "schedule",
        enabled: true,
        config: { action: "whatsapp.send", token: "secret-token", schedule: { type: "interval_minutes", minutes: 1 } }
      }
    });

    await schedulerService.runOnce(new Date());

    const run = await prisma.routineRun.findFirstOrThrow({ where: { routineId: routine.id } });
    expect(run.status).toBe("error");
    const logs = await prisma.systemLog.findMany({ where: { module: "routines", action: "run_error" }, orderBy: { createdAt: "desc" }, take: 5 });
    expect(JSON.stringify(logs)).not.toContain("secret-token");
    await prisma.routine.delete({ where: { id: routine.id } });
    env.SCHEDULER_ENABLED = previous;
  });

  it("ships local production and backup PowerShell scripts", () => {
    const root = resolve(process.cwd(), "..");
    const scripts = ["start-jarvis.ps1", "stop-jarvis.ps1", "status-jarvis.ps1", "backup-jarvis.ps1", "restore-jarvis.ps1", "validate-jarvis.ps1"];
    for (const script of scripts) {
      const path = resolve(root, script);
      expect(existsSync(path), `${script} should exist`).toBe(true);
      expect(readFileSync(path, "utf8")).toContain("E:\\jarvis-home-assistant");
    }
  });

  it("supports native finance accounts, categories, manual transactions and reports", async () => {
    const account = await request(app)
      .post("/api/finance/bank-accounts")
      .set(auth())
      .send({ bankName: "Banco Inter", accountName: testTitle(`financeiro nativo ${Date.now()}`), accountType: "business", currentBalance: 100 })
      .expect(201);
    financeAccountId = account.body.account.id;

    const category = await request(app)
      .post("/api/finance/categories")
      .set(auth())
      .send({ name: testTitle(`financeiro nativo categoria ${Date.now()}`), type: "income", keywords: ["cliente teste nativo"] })
      .expect(201);
    financeCategoryId = category.body.category.id;

    const income = await request(app)
      .post("/api/finance/transactions")
      .set(auth())
      .send({ bankAccountId: financeAccountId, categoryId: financeCategoryId, type: "income", direction: "in", amount: 120, description: testTitle("financeiro nativo entrada cliente teste nativo"), date: new Date().toISOString() })
      .expect(201);
    expect(income.body.transaction.status).toBe("confirmed");

    await request(app)
      .post("/api/finance/transactions")
      .set(auth())
      .send({ bankAccountId: financeAccountId, type: "expense", direction: "out", amount: 20, description: testTitle("financeiro nativo saida servidor"), date: new Date().toISOString() })
      .expect(201);

    const updated = await prisma.bankAccount.findUniqueOrThrow({ where: { id: financeAccountId } });
    expect(Number(updated.currentBalance)).toBe(200);

    const report = await request(app).get("/api/finance/reports/summary").set(auth()).expect(200);
    expect(Number(report.body.totalBalance)).toBeGreaterThanOrEqual(200);
  });

  it("parses Banco Inter OFX and CSV metadata with 2221 transactions", () => {
    const ofx = parseOfxStatement(generateInterOfx());
    expect(ofx.bankName).toBe("Banco Inter");
    expect(ofx.bankCode).toBe("077");
    expect(ofx.accountId).toBe("439443873");
    expect(ofx.accountType).toBe("CHECKING");
    expect(ofx.periodStart?.toISOString().slice(0, 10)).toBe("2024-10-17");
    expect(ofx.periodEnd?.toISOString().slice(0, 10)).toBe("2026-05-16");
    expect(ofx.finalBalance).toBe(326.05);
    expect(ofx.transactions).toHaveLength(2221);
    expect(ofx.transactions[0].externalId).toBe(`FIT-${testRunId}-0`);

    const csv = parseInterCsvStatement(generateInterCsv());
    expect(csv.bankName).toBe("Banco Inter");
    expect(csv.bankCode).toBe("077");
    expect(csv.accountId).toBe("439443873");
    expect(csv.periodStart?.toISOString().slice(0, 10)).toBe("2024-10-17");
    expect(csv.periodEnd?.toISOString().slice(0, 10)).toBe("2026-05-16");
    expect(csv.finalBalance).toBe(326.05);
    expect(csv.transactions).toHaveLength(2221);
  });

  it("handles guided finance assistant drafts and confirmation", async () => {
    const start = await request(app).post("/api/finance/assistant").set(auth()).send({ content: "adicionar entrada de 55" }).expect(200);
    expect(start.body.intent).toBe("finance.collect_account");

    const account = await request(app).post("/api/finance/assistant").set(auth()).send({ content: "Inter PJ" }).expect(200);
    expect(account.body.intent).toMatch(/finance.collect_description|finance.create_account_confirmation/);

    const description = account.body.intent === "finance.create_account_confirmation"
      ? await request(app).post("/api/finance/assistant").set(auth()).send({ content: "sim" }).expect(200).then(() => request(app).post("/api/finance/assistant").set(auth()).send({ content: "saldo 0" }).expect(200)).then(() => request(app).post("/api/finance/assistant").set(auth()).send({ content: "cliente site teste" }).expect(200))
      : await request(app).post("/api/finance/assistant").set(auth()).send({ content: "cliente site teste" }).expect(200);
    expect(description.body.intent).toBe("finance.awaiting_confirmation");

    const saved = await request(app).post("/api/finance/assistant").set(auth()).send({ content: "sim" }).expect(200);
    expect(saved.body.intent).toBe("finance.transaction_saved");
  });

  it("imports Inter CSV only after review and detects duplicates", async () => {
    const csv = [
      "Data;Descricao;Valor;Saldo",
      `${new Date().toLocaleDateString("pt-BR")};PIX recebido ${testTitle("financeiro nativo cliente")};120,00;120,00`,
      `${new Date().toLocaleDateString("pt-BR")};Pagamento servidor ${testTitle("financeiro nativo saida")};-30,00;90,00`
    ].join("\n");

    const uploaded = await request(app)
      .post("/api/finance/imports/upload")
      .set(auth())
      .send({ fileName: "extrato-inter-pj.csv", content: csv, bankAccountId: financeAccountId })
      .expect(201);
    const statementImportId = uploaded.body.import.id;
    expect(uploaded.body.import.status).toBe("review_required");
    expect(uploaded.body.import.totalRows).toBe(2);

    const beforeImport = await prisma.financialTransaction.count({ where: { metadata: { path: ["importId"], equals: statementImportId } } });
    expect(beforeImport).toBe(0);
    const approved = await request(app).post(`/api/finance/imports/${statementImportId}/approve-all`).set(auth()).expect(200);
    expect(approved.body.count).toBe(2);
    const imported = await request(app).post(`/api/finance/imports/${statementImportId}/import-approved`).set(auth()).expect(200);
    expect(imported.body.import.status).toBe("imported");

    const dup = await request(app)
      .post("/api/finance/imports/upload")
      .set(auth())
      .send({ fileName: "extrato-inter-pj.csv", content: csv, bankAccountId: financeAccountId })
      .expect(201);
    expect(dup.body.import.duplicateRows).toBeGreaterThanOrEqual(1);
    await prisma.statementImport.deleteMany({ where: { id: dup.body.import.id } });
  });

  it("imports Banco Inter OFX metadata, creates PJ DO INTER when confirmed, and supports WhatsApp file import mock", async () => {
    const ofx = generateInterOfx(4);
    const uploaded = await request(app)
      .post("/api/finance/import/upload")
      .set(auth())
      .send({ fileName: "Extrato-17-10-2024-a-16-05-2026-OFX.ofx", content: ofx, confirmedAccount: true })
      .expect(201);
    const importId = uploaded.body.import.id;
    expect(uploaded.body.import.bankNameDetected).toBe("Banco Inter");
    expect(uploaded.body.import.accountDetected).toBe("439443873");
    expect(uploaded.body.import.totalRows).toBe(4);
    expect(uploaded.body.import.bankAccount.accountName).toBe("PJ DO INTER");

    const detail = await request(app).get(`/api/finance/imports/${importId}`).set(auth()).expect(200);
    expect(detail.body.import.metadata.finalBalance).toBe(326.05);
    expect(detail.body.import.metadata.summary.incomeRows).toBe(2);
    expect(detail.body.import.metadata.summary.expenseRows).toBe(2);

    const beforeImport = await prisma.financialTransaction.count({ where: { metadata: { path: ["importId"], equals: importId } } });
    expect(beforeImport).toBe(0);
    await request(app).post(`/api/finance/imports/${importId}/approve-all`).set(auth()).expect(200);
    const imported = await request(app).post(`/api/finance/imports/${importId}/import-approved`).set(auth()).expect(200);
    expect(imported.body.import.importedRows).toBeGreaterThan(0);

    const webhook = await request(app)
      .post("/api/whatsapp/webhook")
      .send({
        data: {
          key: { remoteJid: "555511888888888@s.whatsapp.net", fromMe: false },
          message: {
            documentMessage: {
              fileName: "Extrato-17-10-2024-a-16-05-2026-CSV.csv",
              mimetype: "text/csv",
              caption: "ei jarvis importar extrato",
              base64: Buffer.from(generateInterCsv(3), "utf8").toString("base64")
            }
          }
        }
      })
      .expect(200);
    expect(webhook.body.statementImportId).toEqual(expect.any(String));
    await prisma.statementImport.deleteMany({ where: { id: { in: [importId, webhook.body.statementImportId] } } });
  });

  it("ignores WhatsApp messages and files without the required wake phrase", async () => {
    const text = await request(app)
      .post("/api/whatsapp/webhook")
      .send({
        data: {
          key: { remoteJid: "555511888888888@s.whatsapp.net", fromMe: false },
          message: { conversation: "entrada pix recebido R$ 120,00 cliente Joao" }
        }
      })
      .expect(200);
    expect(text.body.ignored).toBe("wake_phrase_required");
    expect(text.body.processedText).toBe(false);

    const file = await request(app)
      .post("/api/whatsapp/webhook")
      .send({
        data: {
          key: { remoteJid: "555511888888888@s.whatsapp.net", fromMe: false },
          message: {
            documentMessage: {
              fileName: "extrato.csv",
              mimetype: "text/csv",
              caption: "importar extrato",
              base64: Buffer.from(generateInterCsv(1), "utf8").toString("base64")
            }
          }
        }
      })
      .expect(200);
    expect(file.body.ignored).toBe("wake_phrase_required");
    expect(file.body.statementImportId).toBeUndefined();

    const transcribeSpy = vi.spyOn(openAiService, "transcribeAudio");
    const fileOnly = await request(app)
      .post("/api/whatsapp/webhook")
      .send({
        data: {
          key: { remoteJid: "555511888888888@s.whatsapp.net", fromMe: false },
          message: {
            documentMessage: {
              fileName: "Extrato-17-10-2024-a-16-05-2026-OFX.ofx",
              mimetype: "application/octet-stream",
              base64: Buffer.from(generateInterOfx(1), "utf8").toString("base64")
            }
          }
        }
      })
      .expect(200);
    expect(fileOnly.body.ignored).toBe("wake_phrase_required");
    expect(fileOnly.body.transcriptionStatus).toBeUndefined();
    expect(transcribeSpy).not.toHaveBeenCalled();
    transcribeSpy.mockRestore();
  });

  it("supports n8n templates, event bus persistence, semantic memory search and safe documents", async () => {
    const template = await request(app).post("/api/n8n/templates/system.alert/test").set(auth()).expect(200);
    expect(["not_configured", "success"]).toContain(template.body.status);

    const bootstrap = await request(app).post("/api/n8n/workflows/bootstrap").set(auth()).expect(200);
    expect(bootstrap.body.templates).toContain("system.alert");

    const memory = await request(app)
      .post("/api/memories")
      .set(auth())
      .send({ type: "fact", title: "Preferencia de automacao", content: "Junior gosta de automacoes com n8n e rotinas seguras.", tags: ["n8n", "rotinas"], importance: 4 })
      .expect(201);
    const search = await request(app).get("/api/memories/search?q=automacoes").set(auth()).expect(200);
    expect(search.body.semantic).toBe(true);
    expect(search.body.memories.length).toBeGreaterThan(0);

    const document = await request(app)
      .post("/api/documents/upload")
      .set(auth())
      .send({ title: "Nota de teste", fileName: "nota-teste.md", fileType: "md", content: "Documento de teste do JARVIS sem segredos.", source: "manual" })
      .expect(201);
    const docs = await request(app).get("/api/documents").set(auth()).expect(200);
    expect(docs.body.documents.some((item: { id: string }) => item.id === document.body.document.id)).toBe(true);
    const chunks = await request(app).get(`/api/documents/${document.body.document.id}/chunks`).set(auth()).expect(200);
    expect(chunks.body.chunks[0].content).toContain("Documento de teste");
    const docSearch = await request(app).get("/api/documents/search?q=JARVIS").set(auth()).expect(200);
    expect(docSearch.body.chunks.length).toBeGreaterThan(0);

    const event = await prisma.integrationEvent.findFirst({ where: { userId, type: "system.alert" }, orderBy: { createdAt: "desc" } });
    expect(event?.payloadRedacted).toBeTruthy();

    await prisma.document.deleteMany({ where: { id: document.body.document.id } });
    await prisma.memory.deleteMany({ where: { id: memory.body.memory.id } });
  });

  it("exposes a safe integrations control center without returning secrets", async () => {
    await prisma.setting.deleteMany({ where: { userId, key: { startsWith: "home_assistant" } } });
    const saved = await request(app)
      .put("/api/integrations/config/home_assistant")
      .set(auth())
      .send({ url: "http://homeassistant.local:8123", token: "super-secret-ha-token" })
      .expect(200);
    expect(JSON.stringify(saved.body)).not.toContain("super-secret-ha-token");

    const stored = await prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId, key: "home_assistant_token" } } });
    expect(String(stored.value)).not.toContain("super-secret-ha-token");

    const status = await request(app).get("/api/integrations/status").set(auth()).expect(200);
    expect(status.body.providers.api_public.url).toContain("apijarvis");
    expect(status.body.providers.home_assistant.tokenConfigured).toBe(true);
    expect(JSON.stringify(status.body)).not.toContain("super-secret-ha-token");

    const test = await request(app).post("/api/integrations/test/n8n").set(auth()).expect(200);
    expect(["not_configured", "success", "error"]).toContain(test.body.status);

    const wizard = await request(app).get("/api/integrations/setup-wizard").set(auth()).expect(200);
    expect(wizard.body.steps.map((step: { provider: string }) => step.provider)).toContain("n8n");

    const setup = await request(app).get("/api/integrations/setup").set(auth()).expect(200);
    expect(setup.body.steps.map((step: { provider: string }) => step.provider)).toEqual(expect.arrayContaining(["api_public", "openai", "gemini", "n8n", "whatsapp", "evolution", "home_assistant", "finance", "documents", "monitoring", "backup", "mobile_pwa", "security"]));
    expect(JSON.stringify(setup.body)).not.toContain("super-secret-ha-token");

    const setupSummary = await request(app).get("/api/integrations/setup/summary").set(auth()).expect(200);
    expect(setupSummary.body.providers.some((item: { provider: string }) => item.provider === "security")).toBe(true);

    const n8nSetupTest = await request(app).post("/api/integrations/setup/n8n/test").set(auth()).expect(200);
    expect(["not_configured", "success", "error"]).toContain(n8nSetupTest.body.status);

    const evolutionWebhook = await request(app).post("/api/integrations/setup/evolution/configure-webhook").set(auth()).expect(200);
    expect(["not_configured", "manual_action_required", "success"]).toContain(evolutionWebhook.body.status);
    expect(JSON.stringify(evolutionWebhook.body)).not.toMatch(/super-secret|apikey/i);

    const safeReset = await request(app).post("/api/integrations/setup/n8n/reset-safe").set(auth()).send({ confirm: "NO" }).expect(200);
    expect(safeReset.body.status).toBe("confirmation_required");

    await prisma.setting.deleteMany({ where: { userId, key: { startsWith: "home_assistant" } } });
  });

  it("stores AI provider keys encrypted and routes user chat through the selected model", async () => {
    const openAiKey = `sk-proj-test-${"a".repeat(36)}`;
    const geminiKey = `AIza${"b".repeat(36)}`;
    await request(app).put("/api/integrations/config/openai").set(auth()).send({ apiKey: openAiKey, model: "gpt-4o-mini" }).expect(200)
      .expect((res) => {
        expect(res.body.providers.openai).toMatchObject({ configured: true, keyConfigured: true, source: "painel", model: "gpt-4o-mini" });
        expect(JSON.stringify(res.body)).not.toContain(openAiKey);
      });
    await request(app).put("/api/integrations/config/gemini").set(auth()).send({ apiKey: geminiKey, model: "gemini-2.5-flash" }).expect(200)
      .expect((res) => {
        expect(res.body.providers.gemini).toMatchObject({ configured: true, keyConfigured: true, source: "painel", model: "gemini-2.5-flash" });
        expect(JSON.stringify(res.body)).not.toContain(geminiKey);
      });

    const storedOpenAi = await prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId, key: "openai_api_key" } } });
    const storedGemini = await prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId, key: "gemini_api_key" } } });
    expect(String(storedOpenAi.value)).toMatch(/^enc:v[12]:/);
    expect(String(storedGemini.value)).toMatch(/^enc:v[12]:/);
    const nvidiaKey = `nvapi-${"c".repeat(36)}`;
    const savedNvidia = await request(app).put("/api/integrations/config/nvidia").set(auth()).send({ apiKey: nvidiaKey, model: "qwen/qwen3-next-80b-a3b-instruct" }).expect(200);
    expect(savedNvidia.body.providers.nvidia).toMatchObject({ configured: true, model: "qwen/qwen3-next-80b-a3b-instruct" });
    expect(JSON.stringify(savedNvidia.body)).not.toContain(nvidiaKey);
    const storedNvidiaKey = await prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId, key: "nvidia_api_key" } } });
    expect(String(storedNvidiaKey.value)).toMatch(/^enc:v[12]:/);
    expect(String(storedNvidiaKey.value)).not.toContain(nvidiaKey);
    const spendPolicy = await prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId, key: "nvidia_zero_spend_policy_v1" } } });
    expect(spendPolicy.value).toMatchObject({ name: "NVIDIA_ZERO_SPEND", budgetMonthlyBrl: 0, billingPeriod: "calendar_month", timezone: "America/Sao_Paulo", paidRequestsAllowed: false, unknownQuotaBehavior: "BLOCK", unknownPricingBehavior: "BLOCK", unknownEntitlementBehavior: "BLOCK", autoFallbackToPaidProvider: false, automaticPaidTopup: false });
    expect(savedNvidia.body.providers.nvidia).toMatchObject({ status: "CONFIGURED_BUT_BILLING_UNVERIFIED", inferenceEnabled: false, billing: { blocked: true, budgetMonthlyBrl: 0, policyPersisted: true } });
    const nvidiaModels = await request(app).get("/api/integrations/models/nvidia").set(auth()).expect(200);
    expect(nvidiaModels.body.models).toContain("qwen/qwen3-next-80b-a3b-instruct");
    const nvidiaFetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network blocked in NVIDIA zero-spend integration test"));
    const nvidiaPostCount = () => vi.mocked(axios.post).mock.calls.filter(([url]) => String(url).includes("integrate.api.nvidia.com") || String(url).includes("invocation.api.nvcf.nvidia.com") || String(url).includes("10.0.0.25:9000")).length;
    const nvidiaCallsBefore = nvidiaPostCount();
    const nvidiaConnectionTest = await request(app).post("/api/integrations/test/nvidia").set(auth()).expect(200);
    expect(nvidiaConnectionTest.body.status).toBe("billing_unverified_blocked");
    expect(nvidiaPostCount()).toBe(nvidiaCallsBefore);
    const blockEvent = await prisma.systemLog.findFirst({ where: { userId, action: "nvidia_zero_spend_blocked" }, orderBy: { createdAt: "desc" } });
    expect(blockEvent?.metadata).toMatchObject({ policy: "NVIDIA_ZERO_SPEND", operation: "llm", model: "qwen/qwen3-next-80b-a3b-instruct", billingPeriod: "calendar_month", billingPeriodKey: expect.stringMatching(/^\d{4}-\d{2}$/), timezone: "America/Sao_Paulo", budgetMonthlyBrl: 0, decision: "BLOCK" });
    await request(app).put("/api/integrations/config/ai_selection").set(auth()).send({ primaryProvider: "nvidia", fallbackProviders: ["ollama", "gemini"] }).expect(200);
    const nvidiaReply = await openAiService.complete([{ role: "user", content: "responda com teste" }], userId);
    expect(nvidiaReply).not.toBe("Resposta NVIDIA sintética.");
    expect(nvidiaPostCount()).toBe(nvidiaCallsBefore);
    expect(await nvidiaAiService.complete([{ role: "user", content: "x".repeat(24_001) }], userId)).toBeNull();
    expect(nvidiaPostCount()).toBe(nvidiaCallsBefore);
    await request(app).put("/api/integrations/config/nvidia_speech").set(auth()).send({ baseUrl: "https://example.com", provider: "nvidia" }).expect(400);
    const nvidiaSpeechConfig = await request(app).put("/api/integrations/config/nvidia_speech").set(auth()).send({ baseUrl: "http://10.0.0.25:9000", provider: "nvidia", fallbackToOpenAi: true }).expect(200);
    expect(nvidiaSpeechConfig.body.providers.nvidia_speech).toMatchObject({ provider: "nvidia", configured: true, language: "pt-BR", fallbackToOpenAi: false, inferenceEnabled: false, billing: { blocked: true, policyPersisted: true } });
    const nvidiaTranscription = await nvidiaSpeechService.transcribeAudio({ buffer: Buffer.alloc(1024), filename: "voice.opus", mimeType: "audio/opus" }, userId);
    expect(nvidiaTranscription).toMatchObject({ status: "billing_unverified_blocked", text: "", fallbackToOpenAi: false });
    const nvidiaSpeechTest = await request(app).post("/api/integrations/test/nvidia_speech").set(auth()).expect(200);
    expect(nvidiaSpeechTest.body.status).toBe("billing_unverified_blocked");
    expect(nvidiaPostCount()).toBe(nvidiaCallsBefore);
    expect(vi.mocked(axios.get).mock.calls.some(([url]) => String(url).includes("10.0.0.25:9000"))).toBe(false);
    const nvidiaTestTts = await request(app).put("/api/integrations/config/tts").set(auth()).send({ provider: "nvidia", nvidiaVoiceId: "Magpie-Multilingual.PT-BR.Diego" }).expect(200);
    expect(nvidiaTestTts.body).toMatchObject({ provider: "nvidia", nvidia: { configured: true, blocked: true, billing: { blocked: true, policyPersisted: true } } });
    await request(app).post("/api/voice/speech").set(auth()).send({ text: "Olá, teste NVIDIA." }).expect(502);
    expect(nvidiaPostCount()).toBe(nvidiaCallsBefore);
    expect(nvidiaFetchSpy).not.toHaveBeenCalled();
    nvidiaFetchSpy.mockRestore();
    await request(app).put("/api/integrations/config/tts").set(auth()).send({ provider: "auto", nvidiaVoiceId: "Magpie-Multilingual.PT-BR.Diego" }).expect(200);
    await request(app).put("/api/integrations/config/nvidia_speech").set(auth()).send({ baseUrl: "", provider: "openai" }).expect(200);
    await request(app).put("/api/integrations/config/ai_selection").set(auth()).send({ primaryProvider: "auto", fallbackProviders: ["ollama", "openai", "gemini", "nvidia"] }).expect(200);

    expect(String(storedOpenAi.value)).not.toContain(openAiKey);
    expect(String(storedGemini.value)).not.toContain(geminiKey);

    const completion = vi.fn().mockResolvedValue({ choices: [{ message: { content: "Resposta via modelo da conta." } }] });
    const openAiModelsList = vi.fn().mockResolvedValue({ data: [{ id: "gpt-4o-mini" }, { id: "text-embedding-3-small" }] });
    openAiService.setClientForTests({ chat: { completions: { create: completion } }, models: { list: openAiModelsList } } as never);
    expect(await getAiProviderOrder(userId)).toEqual(["ollama", "openai", "gemini", "nvidia"]);
    expect((await getAiProviderConfig("openai", userId)).configured).toBe(true);
    const reply = await openAiService.complete([{ role: "user", content: "teste seguro" }], userId);
    expect(completion).toHaveBeenCalledOnce();
    expect(reply).toContain("modelo da conta");
    expect(completion).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-4o-mini" }));
    const openAiTest = await request(app).post("/api/integrations/test/openai").set(auth()).expect(200);
    expect(openAiTest.body.status).toBe("success");
    expect(openAiModelsList).toHaveBeenCalledOnce();
    const openAiModels = await request(app).get("/api/integrations/models/openai").set(auth()).expect(200);
    expect(openAiModels.body).toMatchObject({ status: "success", models: ["gpt-4o-mini"] });
    expect(openAiModelsList).toHaveBeenCalledTimes(2);
    openAiService.setClientForTests(null);

    vi.mocked(axios.get)
      .mockResolvedValueOnce({ status: 200, data: { name: "models/gemini-2.5-flash" } } as never)
      .mockResolvedValueOnce({ status: 200, data: { models: [
        { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] }
      ] } } as never);
    const geminiTest = await request(app).post("/api/integrations/test/gemini").set(auth()).expect(200);
    expect(geminiTest.body.status).toBe("success");
    const geminiModels = await request(app).get("/api/integrations/models/gemini").set(auth()).expect(200);
    expect(geminiModels.body).toMatchObject({ status: "success", models: ["gemini-2.5-flash"] });

    const selection = await request(app).put("/api/integrations/config/ai_selection").set(auth()).send({ primaryProvider: "gemini" }).expect(200);
    expect(selection.body.providers.ai_selection.primaryProvider).toBe("gemini");
    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { candidates: [{ content: { parts: [{ text: "Resposta via Gemini selecionado." }] } }] } } as never);
    const selectedReply = await openAiService.complete([{ role: "user", content: "teste provedor escolhido" }], userId);
    expect(selectedReply).toContain("Gemini selecionado");
    const restoredSelection = await request(app).put("/api/integrations/config/ai_selection").set(auth()).send({ primaryProvider: "auto" }).expect(200);
    expect(restoredSelection.body.providers.ai_selection.primaryProvider).toBe("auto");

    await request(app).put("/api/integrations/config/ollama").set(auth()).send({ baseUrl: "https://example.com", model: "llama3.2:3b" }).expect(400);
    const localOllama = await request(app).put("/api/integrations/config/ollama").set(auth()).send({ baseUrl: "http://100.96.1.2:11434", model: "llama3.2:3b" }).expect(200);
    expect(localOllama.body.providers.ollama).toMatchObject({ configured: true, model: "llama3.2:3b", baseUrl: "http://100.96.1.2:11434" });
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: { models: [{ name: "llama3.2:3b" }, { name: "qwen3:4b" }] } } as never);
    const localModels = await request(app).get("/api/integrations/models/ollama").set(auth()).expect(200);
    expect(localModels.body).toMatchObject({ status: "success", models: ["llama3.2:3b", "qwen3:4b"] });
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: { models: [{ name: "llama3.2:3b" }] } } as never);
    const localTest = await request(app).post("/api/integrations/test/ollama").set(auth()).expect(200);
    expect(localTest.body).toMatchObject({ status: "success", model: "llama3.2:3b" });
    const selectedLocal = await request(app).put("/api/integrations/config/ai_selection").set(auth()).send({ primaryProvider: "ollama" }).expect(200);
    expect(selectedLocal.body.providers.ai_selection.primaryProvider).toBe("ollama");
    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { message: { content: "Resposta local do Ollama." } } } as never);
    const localReply = await openAiService.complete([{ role: "user", content: "responda em português" }], userId);
    expect(localReply).toBe("Resposta local do Ollama.");
    expect(vi.mocked(axios.post).mock.calls.at(-1)?.[0]).toBe("http://100.96.1.2:11434/api/chat");
    await request(app).put("/api/integrations/config/ollama").set(auth()).send({ baseUrl: "", model: "llama3.2:3b" }).expect(200);
    await request(app).put("/api/integrations/config/ai_selection").set(auth()).send({ primaryProvider: "auto" }).expect(200);

    const status = await request(app).get("/api/integrations/status").set(auth()).expect(200);
    expect(status.body.providers.openai.source).toBe("painel");
    expect(status.body.providers.gemini.source).toBe("painel");
    expect(JSON.stringify(status.body)).not.toContain(openAiKey);
    expect(JSON.stringify(status.body)).not.toContain(geminiKey);
  });

  it("lists local n8n workflows and returns manual webhook guidance safely", async () => {
    const workflows = await request(app).get("/api/n8n/workflows/local").set(auth()).expect(200);
    expect(workflows.body.workflows.some((workflow: { name: string }) => workflow.name === "jarvis-system-alert.json")).toBe(true);

    const importOne = await request(app).post("/api/n8n/workflows/import/jarvis-system-alert.json").set(auth()).expect(200);
    expect(["manual_action_required", "success"]).toContain(importOne.body.status);

    const webhook = await request(app).post("/api/whatsapp/configure-webhook").set(auth()).expect(200);
    expect(["not_configured", "manual_action_required", "success"]).toContain(webhook.body.status);
    expect(JSON.stringify(webhook.body)).not.toContain("apikey");
  });
});
