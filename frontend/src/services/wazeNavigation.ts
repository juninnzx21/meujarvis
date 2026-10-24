const WAZE_DEEP_LINK_BASE = "https://waze.com/ul";

export type WazeFavorite = "home" | "work";

export function parseWazeFavoriteIntent(text: string): WazeFavorite | null {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const match = normalized.match(
    /^(?:ei\s+)?jarvis\b[,\s:-]+(?:(?:me\s+)?(?:leve|leva)|(?:abra|abrir)(?:\s+(?:o\s+)?waze)?|(?:trace|traca|calcule|calcula)(?:\s+(?:o\s+|a\s+|um\s+|uma\s+)?(?:rota|caminho|navegacao))?)\s+(?:para|pra|ate|em\s+direcao\s+a)\s+(?:o\s+|a\s+|minha\s+)?(casa|trabalho)[.!?]*$/
  );
  return match?.[1] === "casa" ? "home" : match?.[1] === "trabalho" ? "work" : null;
}

export function buildWazeSearchUrl(destination: string): string | null {
  const normalized = destination.trim().slice(0, 300);
  if (!normalized) return null;

  const url = new URL(WAZE_DEEP_LINK_BASE);
  url.searchParams.set("q", normalized);
  url.searchParams.set("navigate", "yes");
  url.searchParams.set("utm_source", "jarvis");
  return url.toString();
}

export function buildWazeFavoriteUrl(favorite: WazeFavorite): string {
  const url = new URL(WAZE_DEEP_LINK_BASE);
  url.searchParams.set("favorite", favorite);
  url.searchParams.set("navigate", "yes");
  url.searchParams.set("utm_source", "jarvis");
  return url.toString();
}
