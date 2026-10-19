import { randomUUID, createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Socket } from "node:net";
import type { User, Memory } from "@prisma/client";
import type { BrainAskInput } from "./modules/brain/brain.types.js";
import {
  assertDisposablePostgresConnection,
  isVerifiedDisposablePostgresUrl
} from "./test-utils/disposablePostgres.js";

// Only the trusted coordinator supplies this opt-in. Never load a workspace .env.
vi.mock("dotenv", () => ({ default: { config: () => ({}) } }));
const network = vi.hoisted(() => ({ attempts: 0 }));
vi.mock("axios", () => {
  const blocked = () => { network.attempts++; throw new Error("MEM-001: external transport blocked"); };
  return { default: { get: blocked, post: blocked, request: blocked, create: blocked, isAxiosError: () => false } };
});
vi.mock("./utils/logger.js", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const databaseUrl = process.env.JARVIS_AGENT_SYNC_TEST_DATABASE_URL;
const runId = randomUUID();
const syntheticPhones = ["000000000001", "000000000002"];
let prisma: typeof import("./prisma/client.js").prisma;
let app: typeof import("./app.js").app;
let brain: typeof import("./modules/brain/brain.service.js").brainService;
let users: User[] = [];
let memories: Memory[] = [];
const calls: BrainAskInput[] = [];
const sent: Array<{ phone: string; content: string; userId?: string }> = [];
const auth = (index: number) => ({ Authorization: `Bearer ${jwt.sign({ sub: users[index].id, ver: 0 }, "mem001-synthetic-signing-key-only")}` });
const associationKey = (phone: string) => `whatsapp_conversation_${createHash("sha256").update(phone).digest("hex").slice(0, 24)}`;

describe.skipIf(!databaseUrl)("MEM-001 / PostgreSQL coordinator only", () => {
  beforeAll(async () => {
    if (
      process.env.DATABASE_URL !== databaseUrl ||
      !isVerifiedDisposablePostgresUrl(databaseUrl!)
    ) throw new Error("MEM-001 requires the verified disposable PostgreSQL container.");
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("JWT_SECRET", "mem001-synthetic-signing-key-only");
    // Exercise the public error contract, without development-only Prisma details.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SCHEDULER_ENABLED", "false");
    for (const key of ["OPENAI_API_KEY", "GEMINI_API_KEY", "EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE", "N8N_WEBHOOK_URL", "N8N_API_KEY", "HOME_ASSISTANT_URL", "HOME_ASSISTANT_TOKEN", "PIPER_TTS_URL"]) vi.stubEnv(key, "");
    vi.stubGlobal("fetch", () => { network.attempts++; throw new Error("MEM-001: fetch blocked"); });
    const connect = Socket.prototype.connect;
    vi.spyOn(Socket.prototype, "connect").mockImplementation(function (this: Socket, ...args: unknown[]) {
      // Node may pass its normalized [options, callback] overload internally.
      const normalized = Array.isArray(args[0]) ? args[0] as unknown[] : args;
      const first = normalized[0];
      const options = first && typeof first === "object" ? first as { host?: string; path?: string } : undefined;
      const host = options?.host ?? (typeof normalized[1] === "string" ? normalized[1] : "localhost");
      if (!options?.path && !["localhost", "127.0.0.1", "::1"].includes(host)) {
        network.attempts++;
        throw new Error("MEM-001: non-loopback socket blocked");
      }
      return connect.apply(this, args as Parameters<typeof connect>);
    });
    ({ prisma } = await import("./prisma/client.js"));
    await assertDisposablePostgresConnection(databaseUrl!, () => prisma.$queryRaw`
      SELECT current_database() AS "database",
        current_user AS "role",
        inet_server_addr()::text AS "serverAddress",
        inet_server_port() AS "serverPort"
    `);
    ({ app } = await import("./app.js"));
    ({ brainService: brain } = await import("./modules/brain/brain.service.js"));
    for (const label of ["alfa", "beta"]) {
      users.push(await prisma.user.create({ data: { name: `MEM001 ${label}`, email: `mem001-${label}-${runId}@example.invalid`, passwordHash: "not-a-login-hash" } }));
    }
    for (const [index, user] of users.entries()) {
      memories.push(await prisma.memory.create({ data: { userId: user.id, title: `mem001 lembranca ${index}`, content: `Preferencia sintetica exclusiva ${index}`, tags: ["mem001"], createdAt: new Date("2000-01-01"), updatedAt: new Date("2000-01-01") } }));
    }
    const { embeddingService } = await import("./services/embeddingService.js");
    await Promise.all(memories.map((memory) => embeddingService.ensureMemoryEmbedding(memory.id)));
    const actualAsk = brain.ask.bind(brain);
    vi.spyOn(brain, "ask").mockImplementation(async (input) => {
      calls.push(structuredClone(input));
      return actualAsk({ ...input, mode: "quick", allowExternalAI: false, allowTools: false });
    });
    // Pin the webhook's administrative account to our fixture, never the seeded admin.
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(users[0]);
    const { whatsappService } = await import("./services/whatsappService.js");
    vi.spyOn(whatsappService, "runtimeConfig").mockResolvedValue({ apiUrl: "", apiKey: "", instance: "", autoReply: true, source: "settings" });
    vi.spyOn(whatsappService, "send").mockImplementation(async (phone, content, userId) => {
      sent.push({ phone, content, userId });
      return { status: "success", data: {} };
    });
    const { financeIntegrationService } = await import("./services/financeIntegrationService.js");
    vi.spyOn(financeIntegrationService, "handleWhatsAppText").mockResolvedValue(null);
  });

  afterAll(async () => {
    try {
      if (prisma && users.length) {
        // Cleanup only fixtures created by this run; never broad table deletion.
        await prisma.whatsAppMessage.deleteMany({ where: { phone: { in: syntheticPhones }, content: { contains: runId } } });
        await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
      }
    } finally {
      if (prisma) await prisma.$disconnect();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
    expect(network.attempts).toBe(0);
  });

  it("isolates lists, text/semantic search and foreign ID operations symmetrically", async () => {
    for (const index of [0, 1]) {
      const own = memories[index];
      const foreign = memories[1 - index];
      for (const path of ["/api/memories", "/api/memories?q=mem001", "/api/memories/search?q=mem001"]) {
        const response = await request(app).get(path).set(auth(index)).expect(200);
        expect(response.body.memories.map((item: Memory) => item.id)).toEqual([own.id]);
        expect(JSON.stringify(response.body)).not.toContain(foreign.content);
      }
      // There is no GET-by-ID contract today, including for the owner.
      await request(app).get(`/api/memories/${foreign.id}`).set(auth(index)).expect(404);
      const denied = await request(app).put(`/api/memories/${foreign.id}`).set(auth(index)).send({ content: "alteracao proibida" }).expect(500);
      const missing = await request(app).put(`/api/memories/missing-${runId}`).set(auth(index)).send({ content: "alteracao proibida" }).expect(500);
      expect(denied.body.message).toBe(missing.body.message);
      expect(denied.body.requestId).toBe(denied.headers["x-request-id"]);
      expect(missing.body.requestId).toBe(missing.headers["x-request-id"]);
      expect(denied.body.requestId).not.toBe(missing.body.requestId);
      expect(JSON.stringify(denied.body)).not.toContain(foreign.content);
      const removed = await request(app).delete(`/api/memories/${foreign.id}`).set(auth(index)).expect(204);
      const absent = await request(app).delete(`/api/memories/missing-${runId}`).set(auth(index)).expect(204);
      expect(removed.text).toBe(absent.text);
      expect(await prisma.memory.findUnique({ where: { id: foreign.id } })).toEqual(foreign);
      expect(await prisma.memoryEmbedding.count({ where: { memoryId: foreign.id } })).toBe(1);
    }
  });

  it("keeps old memories in Brain context without TTL, including the no-match fallback", async () => {
    const { contextBuilderService } = await import("./modules/brain/contextBuilder.service.js");
    for (const query of ["mem001", "zzznomatchzzz", "que"]) {
      const contexts = await Promise.all(users.map((user) => contextBuilderService.build(user.id, query, "quick")));
      contexts.forEach((context, index) => expect(context.memories.map((item) => item.id)).toEqual([memories[index].id]));
    }
    for (const memory of memories) expect((await prisma.memory.findUniqueOrThrow({ where: { id: memory.id } })).createdAt.getUTCFullYear()).toBe(2000);
  });

  it("isolates parallel account operations and foreign conversation IDs", async () => {
    const responses = await Promise.all(users.map((_, index) => request(app).post("/api/chat/send").set(auth(index)).send({ content: `mem001 chat-${index}-${runId}`, mode: "quick" }).expect(200)));
    await Promise.all(users.map((_, index) => request(app).post("/api/chat/send").set(auth(index)).send({ conversationId: responses[index].body.conversation.id, content: `mem001 chat-followup-${index}` }).expect(200)));
    for (const index of [0, 1]) {
      const input = calls.find((item) => item.message === `mem001 chat-followup-${index}`);
      expect(input?.history).toHaveLength(2);
      expect(input?.history?.[0].content).toContain(`chat-${index}-${runId}`);
      expect(JSON.stringify(input?.history)).not.toContain(`chat-${1 - index}-${runId}`);
    }
    for (const index of [0, 1]) {
      expect(responses[index].body.usedSources.map((item: { id: string }) => item.id)).toContain(memories[index].id);
      expect(JSON.stringify(responses[index].body)).not.toContain(memories[1 - index].content);
      const foreignId = responses[1 - index].body.conversation.id as string;
      await request(app).get(`/api/chat/conversations/${foreignId}`).set(auth(index)).expect(404);
      await request(app).delete(`/api/chat/conversations/${foreignId}`).set(auth(index)).expect(204);
      const redirected = await request(app).post("/api/chat/send").set(auth(index)).send({ conversationId: foreignId, content: `mem001 replacement-${index}` }).expect(200);
      expect(redirected.body.conversation.id).not.toBe(foreignId);
      expect(calls.at(-1)?.history).toEqual([]);
      expect(await prisma.message.count({ where: { conversationId: foreignId } })).toBe(4);
    }
    await Promise.all(users.map(async (_, index) => {
      for (let round = 0; round < 3; round++) {
        await request(app).put(`/api/memories/${memories[index].id}`).set(auth(index)).send({ importance: round + 1 }).expect(200);
        const result = await request(app).get("/api/memories/search?q=mem001").set(auth(index)).expect(200);
        expect(result.body.memories.map((item: Memory) => item.id)).toEqual([memories[index].id]);
      }
      const list = await request(app).get("/api/chat/conversations").set(auth(index)).expect(200);
      expect(list.body.conversations.every((item: { userId: string }) => item.userId === users[index].id)).toBe(true);
    }));
  });

  it("shares owner memory across chat/WhatsApp while separating sender histories and association settings", async () => {
    const foreignConversation = await prisma.conversation.create({ data: { userId: users[1].id, title: "foreign sentinel", messages: { create: { role: "user", content: "FOREIGN_TRANSCRIPT" } } } });
    const key = associationKey(syntheticPhones[0]);
    await prisma.setting.createMany({ data: users.map((user) => ({ userId: user.id, key, value: foreignConversation.id })) });
    const webhook = (phone: string, marker: string) => request(app).post("/api/whatsapp/webhook").send({ phone, text: `ei jarvis mem001 ${marker} ${runId}` }).expect(200);
    await Promise.all(syntheticPhones.map((phone, index) => webhook(phone, `sender-${index}`)));
    const associations = await Promise.all(syntheticPhones.map((phone) => prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId: users[0].id, key: associationKey(phone) } } })));
    expect(new Set(associations.map((item) => item.value)).size).toBe(2);
    expect(associations.every((item) => item.value !== foreignConversation.id)).toBe(true);
    expect((await prisma.setting.findUniqueOrThrow({ where: { userId_key: { userId: users[1].id, key } } })).value).toBe(foreignConversation.id);
    for (const input of calls.filter((item) => item.source === "whatsapp")) {
      expect(input.userId).toBe(users[0].id);
      expect(input.history).toEqual([]);
    }
    await Promise.all([webhook(syntheticPhones[0], "followup-0"), webhook(syntheticPhones[1], "followup-1"), request(app).post("/api/chat/send").set(auth(1)).send({ content: "mem001 parallel beta" }).expect(200)]);
    for (const index of [0, 1]) {
      const input = calls.find((item) => item.source === "whatsapp" && item.message.includes(`followup-${index}`));
      expect(input?.history).toHaveLength(2);
      expect(input?.history?.[0].content).toContain(`sender-${index}`);
      expect(JSON.stringify(input?.history)).not.toContain(`sender-${1 - index}`);
      expect(JSON.stringify(input?.history)).not.toContain("FOREIGN_TRANSCRIPT");
      const history = await prisma.message.findMany({ where: { conversationId: String(associations[index].value) } });
      expect(history).toHaveLength(4);
    }
    expect(sent).toHaveLength(4);
    for (const output of sent) {
      expect(output.userId).toBe(users[0].id);
      expect(output.content).toContain(memories[0].content);
      expect(output.content).not.toContain(memories[1].content);
    }
    expect(await prisma.message.count({ where: { conversationId: foreignConversation.id } })).toBe(1);
    const before = calls.length;
    await request(app).post("/api/whatsapp/webhook").send({ phone: syntheticPhones[0], text: `mem001 ignored ${runId}` }).expect(200);
    expect(calls).toHaveLength(before);
  });

  it("cascades explicit owner deletion to embeddings without affecting another account", async () => {
    await request(app).delete(`/api/memories/${memories[0].id}`).set(auth(0)).expect(204);
    expect(await prisma.memory.count({ where: { id: memories[0].id } })).toBe(0);
    expect(await prisma.memoryEmbedding.count({ where: { memoryId: memories[0].id } })).toBe(0);
    expect(await prisma.memoryEmbedding.count({ where: { memoryId: memories[1].id } })).toBe(1);
    const { contextBuilderService } = await import("./modules/brain/contextBuilder.service.js");
    expect((await contextBuilderService.build(users[0].id, "mem001", "quick")).memories).toEqual([]);
    await prisma.user.delete({ where: { id: users[1].id } });
    expect(await prisma.memory.count({ where: { id: memories[1].id } })).toBe(0);
    expect(await prisma.memoryEmbedding.count({ where: { memoryId: memories[1].id } })).toBe(0);
  });
});
