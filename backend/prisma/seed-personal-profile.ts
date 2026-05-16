import { PrismaClient } from "@prisma/client";
import { personalProfileMemories, type PersonalProfileMemory } from "./personal-profile/profile-data.js";

const prisma = new PrismaClient();

const allowedSensitiveSystemTitles = new Set([
  "Dados proibidos em memoria comum",
  "Como lidar com informacoes sensiveis",
  "Respostas sem expor segredos"
]);

export function isSensitiveMemory(memory: Pick<PersonalProfileMemory, "type" | "title" | "content">) {
  if (memory.type === "system" && allowedSensitiveSystemTitles.has(memory.title)) return false;
  const content = memory.content.toLowerCase();
  const blockedPatterns = [
    /\bsenha\s*[:=]/i,
    /\bpassword\s*[:=]/i,
    /\btoken\s*[:=]/i,
    /\bapi\s*key\s*[:=]/i,
    /\bsecret\s*[:=]/i,
    /\bjwt\s*[:=]/i,
    /\bprivate\s+key\b/i,
    /\bssh-rsa\s+private\b/i,
    /\bbearer\s+[a-z0-9._~+/=-]{12,}/i,
    /\bcpf\s*[:=]/i,
    /\bcartao\s*[:=]/i,
    /\bcartão\s*[:=]/i,
    /\bbanco\s*[:=]/i,
    /\bacesso\s+root\s*[:=]/i,
    /\bdirectadmin\s+password\b/i,
    /\bdatabase\s+password\b/i
  ];
  return blockedPatterns.some((pattern) => pattern.test(content));
}

export async function importPersonalProfile() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@jarvis.local" } });
  if (!admin) throw new Error("Usuario admin@jarvis.local nao encontrado. Rode npx prisma db seed antes.");

  const summary = { created: 0, updated: 0, skipped: 0, total: personalProfileMemories.length };

  for (const memory of personalProfileMemories) {
    if (isSensitiveMemory(memory)) {
      summary.skipped += 1;
      continue;
    }

    const existing = await prisma.memory.findFirst({
      where: { userId: admin.id, title: memory.title, type: memory.type }
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
      existing.content !== memory.content ||
      existing.importance !== memory.importance ||
      JSON.stringify(existing.tags) !== JSON.stringify(memory.tags);

    if (needsUpdate) {
      await prisma.memory.update({
        where: { id: existing.id },
        data: {
          content: memory.content,
          tags: memory.tags,
          importance: memory.importance
        }
      });
      summary.updated += 1;
    }
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
