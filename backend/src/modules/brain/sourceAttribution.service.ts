import type { BrainSourceItem } from "./brain.types.js";

export class SourceAttributionService {
  format(sources: BrainSourceItem[]) {
    return sources.slice(0, 5).map((item) => ({
      type: item.type,
      title: item.title,
      excerpt: item.excerpt,
      id: item.id
    }));
  }

  asText(sources: BrainSourceItem[]) {
    if (!sources.length) return "Fontes internas: nenhuma fonte especifica encontrada.";
    return `Fontes internas usadas:\n${sources.slice(0, 5).map((item) => `- ${item.title} (${item.type})`).join("\n")}`;
  }
}

export const sourceAttributionService = new SourceAttributionService();
