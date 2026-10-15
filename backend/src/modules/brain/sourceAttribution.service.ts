import type { BrainSourceItem } from "./brain.types.js";

export class SourceAttributionService {
  format(sources: BrainSourceItem[]) {
    return sources.slice(0, 8).map((item) => ({
      type: item.type,
      title: item.title,
      excerpt: item.excerpt,
      id: item.id,
      url: item.url
    }));
  }

  asText(sources: BrainSourceItem[]) {
    if (!sources.length) return "Fontes consultadas: nenhuma fonte especifica encontrada.";
    return `Fontes consultadas:\n${sources.slice(0, 8).map((item) => `- ${item.title} (${item.type})${item.url ? `: ${item.url}` : ""}`).join("\n")}`;
  }
}

export const sourceAttributionService = new SourceAttributionService();
