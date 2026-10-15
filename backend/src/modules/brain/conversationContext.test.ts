import { describe, expect, it } from "vitest";
import { recentConversationHistory, shouldSearchTheWeb } from "./conversationContext.js";

describe("conversation context", () => {
  it("keeps recent turns available to every AI provider within bounded limits", () => {
    const history = Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, content: `${index}:${"x".repeat(3500)}` }));
    const recent = recentConversationHistory(history);
    expect(recent).toHaveLength(8);
    expect(recent[0]?.content.startsWith("2:")).toBe(true);
    expect(recent.every((item) => item.content.length === 3000)).toBe(true);
  });

  it("searches the web for a contextual follow-up to a recent conversation", () => {
    expect(shouldSearchTheWeb("E por que?", "unknown", [{ role: "user", content: "Como funciona a energia solar?" }])).toBe(true);
  });

  it("does not send finance or operational follow-ups to web search", () => {
    const history = [{ role: "user" as const, content: "Qual o saldo do mês?" }];
    expect(shouldSearchTheWeb("E no mês passado?", "finance.query", history)).toBe(false);
    expect(shouldSearchTheWeb("E agora?", "system.status", history)).toBe(false);
  });
});
