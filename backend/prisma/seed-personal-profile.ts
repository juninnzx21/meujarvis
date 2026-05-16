import { PrismaClient } from "@prisma/client";
import { personalProfileMemories, type PersonalProfileMemory } from "./personal-profile/profile-data.js";

const prisma = new PrismaClient();

const allowedSensitiveSystemTitles = new Set([
  "Dados proibidos em memória comum",
  "Dados proibidos em memoria comum",
  "Como lidar com informações sensíveis",
  "Como lidar com informacoes sensiveis",
  "Respostas sem expor segredos"
]);

function normalizeTitle(title: string) {
  return title.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function isSensitiveMemory(content: string, title: string, type: PersonalProfileMemory["type"]) {
  if (type === "system" && allowedSensitiveSystemTitles.has(title)) return false;

  const text = content.toLowerCase();
  const blockedPatterns = [
    /\b(senha|password)\s*[:=]\s*\S{6,}/i,
    /\b(token|api\s*key|secret|jwt|bearer)\s*[:=]\s*\S{8,}/i,
    /\bprivate\s+key\b/i,
    /\bssh\s+private\s+key\b/i,
    /\bchave\s+privada\b/i,
    /\bbearer\s+[a-z0-9._~+/=-]{12,}/i,
    /\bcpf\s*[:=]\s*[\d.-]{8,}/i,
    /\bcart(?:a|ã)o\s*[:=]\s*[\d\s-]{12,}/i,
    /\bbanco\s+completo\s*[:=]/i,
    /\bcredencial\s*[:=]\s*\S{6,}/i,
    /\broot\s+password\s*[:=]/i,
    /\bacesso\s+root\s*[:=]\s*\S{6,}/i,
    /\bdirectadmin\s+password\b/i,
    /\bdatabase\s+password\b/i
  ];

  return blockedPatterns.some((pattern) => pattern.test(text));
}

export async function importPersonalProfile() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@jarvis.local" } });
  if (!admin) throw new Error("Usuario admin@jarvis.local nao encontrado. Rode npx prisma db seed antes.");

  const summary = { created: 0, updated: 0, skipped: 0, total: personalProfileMemories.length };

  for (const memory of personalProfileMemories) {
    if (isSensitiveMemory(memory.content, memory.title, memory.type)) {
      console.log(`memória ignorada por segurança: ${memory.title}`);
      summary.skipped += 1;
      continue;
    }

    const titleCandidates = Array.from(new Set([
      memory.title,
      normalizeTitle(memory.title),
      ...(memory.aliases ?? [])
    ]));

    const existing = await prisma.memory.findFirst({
      where: { userId: admin.id, type: memory.type, title: { in: titleCandidates } },
      orderBy: { updatedAt: "desc" }
    });

    if (!existing) {
      await prisma.memory.create({
        data: {
          userId: admin.id,
          type: memory.type,
          title: memory.title,
          content: memory.content,
          tags: memory.tags,
          importance: memory.importance
        }
      });
      summary.created += 1;
      continue;
    }

    const needsUpdate =
      existing.title !== memory.title ||
      existing.content !== memory.content ||
      existing.importance !== memory.importance ||
      JSON.stringify(existing.tags) !== JSON.stringify(memory.tags);

    if (needsUpdate) {
      await prisma.memory.update({
        where: { id: existing.id },
        data: {
          title: memory.title,
          content: memory.content,
          tags: memory.tags,
          importance: memory.importance
        }
      });
      summary.updated += 1;
    }

    await prisma.memory.deleteMany({
      where: {
        userId: admin.id,
        type: memory.type,
        title: { in: titleCandidates },
        id: { not: existing.id }
      }
    });
  }

  await prisma.systemLog.create({
    data: {
      userId: admin.id,
      level: "info",
      module: "memory",
      action: "seed_personal_profile",
      message: "Base de conhecimento pessoal importada",
      metadata: summary
    }
  });

  return summary;
}

async function main() {
  const summary = await importPersonalProfile();
  console.log(`Personal profile memory import completed. created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} total=${summary.total}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "Erro desconhecido ao importar perfil pessoal.");
    await prisma.$disconnect();
    process.exit(1);
  });
