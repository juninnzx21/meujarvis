import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { parseInterCsvStatement } from "./modules/finance/parsers/interCsvParser.js";
import { parseOfxStatement } from "./modules/finance/parsers/ofxParser.js";
import { prisma } from "./prisma/client.js";
import { homeAssistantService } from "./services/homeAssistantService.js";
import { openAiService } from "./services/openAiService.js";
import { schedulerService } from "./services/schedulerService.js";
import { writeSystemLog } from "./services/systemLogService.js";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    request: vi.fn()
  }
}));

const credentials = { email: "admin@jarvis.local", password: "12345678" };
let token = "";
let automationId = "";
let routineId = "";
let scheduledRoutineId = "";
let notificationId = "";
let userId = "";
let financeAccountId = "";
let financeCategoryId = "";
let statementImportId = "";
const schedulerTaskIds: string[] = [];

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
    return `<STMTTRN><TRNTYPE>${type}<DTPOSTED>${year}${month}${day}<TRNAMT>${amount}<FITID>FIT-${i}<MEMO>${memo}</STMTTRN>`;
  }).join("\n");
  return `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>077<ACCTID>439443873<ACCTTYPE>CHECKING</BANKACCTFROM><BANKTRANLIST><DTSTART>20241017<DTEND>20260516${transactions}</BANKTRANLIST><LEDGERBAL><BALAMT>326.05<DTASOF>20260516</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
}

const auth = () => ({ Authorization: `Bearer ${token}` });

describe("JARVIS Home AI API", () => {
  beforeAll(async () => {
    const login = await request(app).post("/api/auth/login").send(credentials).expect(200);
    token = login.body.token;
    userId = login.body.user.id;
  });

  afterAll(async () => {
    if (automationId) {
      await prisma.automation.deleteMany({ where: { id: automationId } });
    }
    if (routineId) {
      await prisma.routine.deleteMany({ where: { id: routineId } });
    }
    if (scheduledRoutineId) {
      await prisma.routine.deleteMany({ where: { id: scheduledRoutineId } });
    }
    if (notificationId) {
      await prisma.notification.deleteMany({ where: { id: notificationId } });
    }
    if (statementImportId) {
      await prisma.statementImport.deleteMany({ where: { id: statementImportId } });
    }
    await prisma.financialTransaction.deleteMany({ where: { userId, description: { contains: "Teste automatizado financeiro nativo" } } });
    if (financeAccountId) {
      await prisma.bankAccount.deleteMany({ where: { id: financeAccountId } });
    }
    if (financeCategoryId) {
      await prisma.financialCategory.deleteMany({ where: { id: financeCategoryId } });
    }
    await prisma.assistantDraftAction.deleteMany({ where: { userId } });
    await prisma.memory.deleteMany({ where: { title: { startsWith: "Teste automatizado" } } });
    await prisma.task.deleteMany({ where: { title: { startsWith: "Teste automatizado" } } });
    await prisma.setting.deleteMany({ where: { userId, key: { in: ["finance_api_url", "finance_api_token", "n8n_webhook_url", "n8n_api_key"] } } });
    if (schedulerTaskIds.length > 0) {
      await prisma.task.deleteMany({ where: { id: { in: schedulerTaskIds } } });
    }
    await prisma.$disconnect();
  });

  it("authenticates the demo user without exposing password data", async () => {
    const login = await request(app).post("/api/auth/login").send(credentials).expect(200);
    expect(login.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(login.body)).not.toMatch(/password|passwordHash/i);

    const me = await request(app).get("/api/auth/me").set(auth()).expect(200);
    expect(me.body.user.email).toBe(credentials.email);
  });

  it("can block demo login when production flag disables it", async () => {
    const previous = env.ALLOW_DEMO_LOGIN;
    env.ALLOW_DEMO_LOGIN = false;
    await request(app).post("/api/auth/login").send(credentials).expect(403).expect((res) => {
      expect(res.body.message).toContain("demo");
    });
    env.ALLOW_DEMO_LOGIN = previous;
  });

  it("reports health and safe integration fallback status", async () => {
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body.app).toBe("ok");
    expect(health.body.database).toBe("ok");

    const full = await request(app).get("/api/health/full").expect(200);
    expect(full.body.integrations.n8n.status).toMatch(/configured|not_configured/);
    expect(full.body.integrations.whatsapp.autoReply).toBe(false);
    expect(full.body.observability.uptimeSeconds).toEqual(expect.any(Number));
    expect(full.body.observability.logsCount).toEqual(expect.any(Number));
    expect(Array.isArray(full.body.observability.recentFailures)).toBe(true);
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

  it("supports memory CRUD and memory creation through chat intent", async () => {
    const created = await request(app)
      .post("/api/memories")
      .set(auth())
      .send({ title: "Teste automatizado memória", content: "Conteúdo de teste", type: "note", tags: ["test"], importance: 3 })
      .expect(201);

    await request(app)
      .put(`/api/memories/${created.body.memory.id}`)
      .set(auth())
      .send({ title: "Teste automatizado memória editada", content: "Editado", type: "note", tags: ["test"], importance: 4 })
      .expect(200);

    const chat = await request(app)
      .post("/api/chat/send")
      .set(auth())
      .send({ content: "lembre que eu gosto de automações com n8n" })
      .expect(200);
    expect(chat.body.intent).toBe("memory.create");

    const list = await request(app).get("/api/memories?q=n8n").set(auth()).expect(200);
    expect(list.body.memories.length).toBeGreaterThan(0);

    await request(app).delete(`/api/memories/${created.body.memory.id}`).set(auth()).expect(204);
  });

  it("supports task CRUD and task creation through chat intent", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .set(auth())
      .send({ title: "Teste automatizado tarefa", description: "Teste", priority: "high", status: "pending" })
      .expect(201);

    await request(app)
      .put(`/api/tasks/${created.body.task.id}`)
      .set(auth())
      .send({ title: "Teste automatizado tarefa editada", description: "Editado", priority: "urgent", status: "in_progress" })
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
      .send({ name: "Teste automatizado automação", triggerType: "manual", actionType: "internal", enabled: true, config: { action: "test" } })
      .expect(201);
    automationId = created.body.automation.id;

    const run = await request(app).post(`/api/automations/${automationId}/run`).set(auth()).send({ input: "test" }).expect(200);
    expect(run.body.log.status).toBe("success");

    const logs = await request(app).get(`/api/automations/${automationId}/logs`).set(auth()).expect(200);
    expect(logs.body.logs.length).toBeGreaterThan(0);

    await request(app)
      .post("/api/automations")
      .set(auth())
      .send({ name: "Teste automatizado perigoso", triggerType: "manual", actionType: "internal", enabled: true, config: { cmd: "rm -rf /" } })
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
      .send({ type: "income", status: "received", description: "Teste automatizado financeiro", amount: 120, transaction_date: "2026-05-14", payment_method: "pix" })
      .expect(200);
    expect(created.body.status).toBe("success");

    const cleared = await request(app).delete("/api/finance/config").set(auth()).expect(200);
    expect(cleared.body.status).toBe("not_configured");
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
    expect(String(stored.value)).toMatch(/^enc:v1:/);
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

  it("validates WhatsApp phone numbers and sends through a mocked Evolution API", async () => {
    await request(app).post("/api/whatsapp/send").set(auth()).send({ phone: "abc", content: "teste", confirmed: true }).expect(400);

    const saved = await request(app)
      .put("/api/whatsapp/config")
      .set(auth())
      .send({ apiUrl: "https://evolution.test", apiKey: "secret-key", instance: "jarvis-test", autoReply: false })
      .expect(200);
    expect(saved.body.status).toBe("configured");
    expect(JSON.stringify(saved.body)).not.toContain("secret-key");

    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: { instance: "open" } });
    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: { ok: true, apikey: "secret-key" } });

    const test = await request(app).post("/api/whatsapp/test-connection").set(auth()).expect(200);
    expect(test.body.status).toBe("success");

    const send = await request(app).post("/api/whatsapp/send").set(auth()).send({ phone: "5511999999999", content: "teste", confirmed: true }).expect(200);
    expect(send.body.status).toBe("success");

    const cleared = await request(app).delete("/api/whatsapp/config").set(auth()).expect(200);
    expect(cleared.body.status).toBe("not_configured");
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

  it("supports routines CRUD, run history, and seed routines", async () => {
    const seed = await request(app).get("/api/routines").set(auth()).expect(200);
    expect(seed.body.routines.length).toBeGreaterThanOrEqual(4);
    const created = await request(app)
      .post("/api/routines")
      .set(auth())
      .send({ name: "Teste automatizado rotina", description: "Rotina de teste", triggerType: "manual", enabled: true, config: { report: "tasks" } })
      .expect(201);
    routineId = created.body.routine.id;
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
    const notification = await prisma.notification.create({ data: { userId, title: "Teste automatizado notificacao", message: "Aviso seguro", type: "info" } });
    notificationId = notification.id;
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
      .send({ title: "Teste automatizado lembrete", dueDate: yesterday, reminderAt: today, priority: "high" })
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
        name: "Teste automatizado rotina scheduler",
        description: "Scheduler seguro",
        triggerType: "schedule",
        enabled: true,
        config: { report: "tasks", schedule: { type: "interval_minutes", minutes: 1 } }
      }
    });
    scheduledRoutineId = routine.id;

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
    const title = `Teste automatizado reminder scheduler ${Date.now()}`;
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        priority: "urgent",
        reminderAt: new Date(Date.now() - 60_000)
      }
    });
    schedulerTaskIds.push(task.id);

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
    const title = `Teste automatizado overdue scheduler ${Date.now()}`;
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        priority: "high",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    });
    schedulerTaskIds.push(task.id);

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
        name: "Teste automatizado rotina sensivel scheduler",
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
      .send({ bankName: "Banco Inter", accountName: `Teste automatizado financeiro nativo ${Date.now()}`, accountType: "business", currentBalance: 100 })
      .expect(201);
    financeAccountId = account.body.account.id;

    const category = await request(app)
      .post("/api/finance/categories")
      .set(auth())
      .send({ name: `Teste automatizado financeiro nativo categoria ${Date.now()}`, type: "income", keywords: ["cliente teste nativo"] })
      .expect(201);
    financeCategoryId = category.body.category.id;

    const income = await request(app)
      .post("/api/finance/transactions")
      .set(auth())
      .send({ bankAccountId: financeAccountId, categoryId: financeCategoryId, type: "income", direction: "in", amount: 120, description: "Teste automatizado financeiro nativo entrada cliente teste nativo", date: new Date().toISOString() })
      .expect(201);
    expect(income.body.transaction.status).toBe("confirmed");

    await request(app)
      .post("/api/finance/transactions")
      .set(auth())
      .send({ bankAccountId: financeAccountId, type: "expense", direction: "out", amount: 20, description: "Teste automatizado financeiro nativo saida servidor", date: new Date().toISOString() })
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
    expect(ofx.transactions[0].externalId).toBe("FIT-0");

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
      ? await request(app).post("/api/finance/assistant").set(auth()).send({ content: "sim" }).expect(200).then(() => request(app).post("/api/finance/assistant").set(auth()).send({ content: "0" }).expect(200)).then(() => request(app).post("/api/finance/assistant").set(auth()).send({ content: "cliente site teste" }).expect(200))
      : await request(app).post("/api/finance/assistant").set(auth()).send({ content: "cliente site teste" }).expect(200);
    expect(description.body.intent).toBe("finance.awaiting_confirmation");

    const saved = await request(app).post("/api/finance/assistant").set(auth()).send({ content: "sim" }).expect(200);
    expect(saved.body.intent).toBe("finance.transaction_saved");
  });

  it("imports Inter CSV only after review and detects duplicates", async () => {
    const csv = [
      "Data;Descricao;Valor;Saldo",
      `${new Date().toLocaleDateString("pt-BR")};PIX recebido Teste automatizado financeiro nativo cliente;120,00;120,00`,
      `${new Date().toLocaleDateString("pt-BR")};Pagamento servidor Teste automatizado financeiro nativo;-30,00;90,00`
    ].join("\n");

    const uploaded = await request(app)
      .post("/api/finance/imports/upload")
      .set(auth())
      .send({ fileName: "extrato-inter-pj.csv", content: csv, bankAccountId: financeAccountId })
      .expect(201);
    statementImportId = uploaded.body.import.id;
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
    await prisma.financialTransaction.deleteMany({ where: { userId, transactionExternalId: { startsWith: "FIT-" } } });
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
          key: { remoteJid: "5531993239198@s.whatsapp.net", fromMe: false },
          message: {
            documentMessage: {
              fileName: "Extrato-17-10-2024-a-16-05-2026-CSV.csv",
              mimetype: "text/csv",
              base64: Buffer.from(generateInterCsv(3), "utf8").toString("base64")
            }
          }
        }
      })
      .expect(200);
    expect(webhook.body.statementImportId).toEqual(expect.any(String));
    await prisma.statementImport.deleteMany({ where: { id: { in: [importId, webhook.body.statementImportId] } } });
  });
});
