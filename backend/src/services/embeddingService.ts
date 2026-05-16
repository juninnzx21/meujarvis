import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";

function mockEmbedding(text: string) {
  const buckets = new Array<number>(16).fill(0);
  for (let index = 0; index < text.length; index += 1) {
    buckets[index % buckets.length] += text.charCodeAt(index) / 1000;
  }
  return buckets.map((value) => Number(value.toFixed(6)));
}

function cosineSimilarity(a: number[], b: number[]) {
  const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (!normA || !normB) return 0;
  return dot / (normA * normB);
}

export const embeddingService = {
  provider: "local_mock",
  model: "jarvis-local-hash-16",
  createEmbedding(text: string) {
    return mockEmbedding(text);
  },
  async ensureMemoryEmbedding(memoryId: string) {
    const memory = await prisma.memory.findUnique({ where: { id: memoryId } });
    if (!memory) return null;
    const vector = this.createEmbedding(`${memory.title}\n${memory.content}\n${memory.tags.join(" ")}`);
    return prisma.memoryEmbedding.upsert({
      where: { memoryId },
      update: { provider: this.provider, model: this.model, vector },
      create: { memoryId, provider: this.provider, model: this.model, vector }
    });
  },
  async searchMemories(userId: string, query: string) {
    const queryVector = this.createEmbedding(query);
    const memories = await prisma.memory.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { tags: { has: query } }
        ]
      },
      include: { embedding: true },
      take: 20
    });

    const semanticFallback = memories.map((memory) => ({
      ...memory,
      score: memory.embedding?.vector && Array.isArray(memory.embedding.vector)
        ? cosineSimilarity(queryVector, memory.embedding.vector as number[])
        : 0.5
    }));

    await writeSystemLog({ userId, module: "memory", action: "semantic_search", message: "Busca de memoria executada com fallback local", metadata: { queryLength: query.length, resultCount: semanticFallback.length } });
    return semanticFallback.sort((a, b) => b.score - a.score);
  }
};
