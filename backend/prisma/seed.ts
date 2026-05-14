import bcrypt from "bcrypt";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = {
  assistant_name: "JARVIS",
  formal_mode: false,
  voice_enabled: true,
  whatsapp_enabled: false,
  whatsapp_auto_reply: false,
  n8n_enabled: false,
  home_assistant_enabled: false,
  require_confirmation_for_sensitive_actions: true,
  theme: "dark"
};

async function ensureMemory(userId: string, title: string, data: Omit<Prisma.MemoryUncheckedCreateInput, "id" | "userId" | "title" | "createdAt" | "updatedAt">) {
  const existing = await prisma.memory.findFirst({ where: { userId, title } });
  if (existing) return existing;
  return prisma.memory.create({ data: { userId, title, ...data } });
}

async function ensureTask(userId: string, title: string, data: Omit<Prisma.TaskUncheckedCreateInput, "id" | "userId" | "title" | "createdAt" | "updatedAt">) {
  const existing = await prisma.task.findFirst({ where: { userId, title } });
  if (existing) return existing;
  return prisma.task.create({ data: { userId, title, ...data } });
}

async function ensureAutomation(userId: string, name: string, data: Omit<Prisma.AutomationUncheckedCreateInput, "id" | "userId" | "name" | "createdAt" | "updatedAt">) {
  const existing = await prisma.automation.findFirst({ where: { userId, name } });
  if (existing) return existing;
  return prisma.automation.create({ data: { userId, name, ...data } });
}

async function ensureRoutine(userId: string, name: string, data: Omit<Prisma.RoutineUncheckedCreateInput, "id" | "userId" | "name" | "createdAt" | "updatedAt">) {
  const existing = await prisma.routine.findFirst({ where: { userId, name } });
  if (existing) return existing;
  return prisma.routine.create({ data: { userId, name, ...data } });
}

async function main() {
  const passwordHash = await bcrypt.hash("12345678", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@jarvis.local" },
    update: { name: "Junior Rodrigues", role: "admin" },
    create: {
      name: "Junior Rodrigues",
      email: "admin@jarvis.local",
      passwordHash,
      role: "admin"
    }
  });

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { userId_key: { userId: admin.id, key } },
      update: { value },
      create: { userId: admin.id, key, value }
    });
  }

  await ensureMemory(admin.id, "Idioma preferido", {
    type: "preference",
    content: "Responder sempre em portugues brasileiro, com objetividade e profissionalismo.",
    tags: ["idioma", "preferencia"],
    importance: 5
  });
  await ensureMemory(admin.id, "Seguranca de automacoes", {
    type: "system",
    content: "Acoes sensiveis exigem confirmacao explicita antes da execucao.",
    tags: ["seguranca", "automacoes"],
    importance: 5
  });

  await ensureTask(admin.id, "Configurar credenciais da OpenAI", { priority: "high", status: "pending" });
  await ensureTask(admin.id, "Conectar Home Assistant", { priority: "medium", status: "pending" });

  await ensureAutomation(admin.id, "Relatorio diario via n8n", {
    description: "Exemplo seguro de automacao manual para acionar webhook do n8n.",
    triggerType: "manual",
    actionType: "n8n",
    enabled: false,
    config: { flow: "daily_report" }
  });
  await ensureAutomation(admin.id, "Cena cinema", {
    description: "Exemplo de automacao Home Assistant para cena segura.",
    triggerType: "manual",
    actionType: "home_assistant",
    enabled: false,
    config: { domain: "scene", service: "turn_on", entity_id: "scene.cinema" }
  });

  await ensureRoutine(admin.id, "Resumo diário", { description: "Gera resumo diario de tarefas, memorias, erros e integracoes.", triggerType: "manual", enabled: true, config: { report: "daily-summary" } });
  await ensureRoutine(admin.id, "Revisão de tarefas pendentes", { description: "Lista pendencias e atrasos.", triggerType: "manual", enabled: true, config: { report: "tasks" } });
  await ensureRoutine(admin.id, "Checagem do sistema", { description: "Consulta status operacional.", triggerType: "manual", enabled: true, config: { report: "system" } });
  await ensureRoutine(admin.id, "Teste de integrações", { description: "Executa verificacoes seguras de integracoes.", triggerType: "manual", enabled: false, config: { report: "integrations" } });

  await prisma.systemLog.createMany({
    data: [
      { userId: admin.id, level: "info", module: "seed", action: "create_demo", message: "Usuario demo criado ou atualizado." },
      { userId: admin.id, level: "info", module: "system", action: "bootstrap", message: "Base inicial do JARVIS preparada." }
    ]
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
