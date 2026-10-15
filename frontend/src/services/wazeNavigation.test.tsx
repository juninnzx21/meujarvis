import { describe, expect, it } from "vitest";
import { buildWazeFavoriteUrl, buildWazeSearchUrl, parseWazeFavoriteIntent } from "./wazeNavigation";

describe("Waze deep links", () => {
  it("builds a navigation search URL with an encoded destination", () => {
    const url = buildWazeSearchUrl("Av. Paulista, São Paulo");
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe("https://waze.com/ul");
    expect(parsed.searchParams.get("q")).toBe("Av. Paulista, São Paulo");
    expect(parsed.searchParams.get("navigate")).toBe("yes");
    expect(parsed.searchParams.get("utm_source")).toBe("jarvis");
  });

  it("does not create a search link for an empty destination", () => {
    expect(buildWazeSearchUrl("  ")).toBeNull();
  });

  it.each(["home", "work"] as const)("opens the user's Waze %s favorite", (favorite) => {
    const parsed = new URL(buildWazeFavoriteUrl(favorite));
    expect(parsed.origin + parsed.pathname).toBe("https://waze.com/ul");
    expect(parsed.searchParams.get("favorite")).toBe(favorite);
    expect(parsed.searchParams.get("navigate")).toBe("yes");
  });

  it.each([
    ["Jarvis, trace o caminho para casa", "home"],
    ["Ei Jarvis, abra o Waze para o trabalho", "work"],
    ["Járvis, me leve pra casa", "home"]
  ])("recognizes an explicit voice navigation request", (text, favorite) => {
    expect(parseWazeFavoriteIntent(text)).toBe(favorite);
  });

  it("does not turn general questions into navigation", () => {
    expect(parseWazeFavoriteIntent("Jarvis, como faço para ir para casa? ")).toBeNull();
    expect(parseWazeFavoriteIntent("trace caminho para casa")).toBeNull();
  });
});
