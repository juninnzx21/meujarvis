import { prisma } from "../prisma/client.js";

const stopWords = new Set(["para", "com", "que", "uma", "por", "dos", "das", "meu", "minha", "status", "sistema"]);

export function extractSearchTerms(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length >= 3 && !stopWords.has(term))
    .slice(0, 8);
}

export async function findRelevantMemories(userId: string, text: string, limit = 5) {
  const terms = extractSearchTerms(text);
  if (!terms.length) {
    return prisma.memory.findMany({ where: { userId }, orderBy: [{ importance: "desc" }, { createdAt: "desc" }], take: limit });
  }

  return prisma.memory.findMany({
    where: {
      userId,
      OR: terms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" as const } },
        { content: { contains: term, mode: "insensitive" as const } },
        { tags: { has: term } }
      ])
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: limit
  });
}
