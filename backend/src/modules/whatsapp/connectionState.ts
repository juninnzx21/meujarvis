export type WhatsAppConnectionState = "connected" | "disconnected" | "connecting" | "unknown";

function readRawState(value: unknown): string {
  if (!value || typeof value !== "object") return "unknown";
  const stack = [value as Record<string, unknown>];
  const seen = new Set<unknown>();
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const [key, item] of Object.entries(current)) {
      if (/^(state|connectionState|connectionStatus)$/i.test(key) && typeof item === "string") return item.toLowerCase();
      if (item && typeof item === "object") stack.push(item as Record<string, unknown>);
    }
  }
  return "unknown";
}

export function normalizeWhatsAppConnectionState(value: unknown): WhatsAppConnectionState {
  const state = readRawState(value);
  if (["open", "connected", "connect", "online"].includes(state)) return "connected";
  if (["close", "closed", "disconnected", "offline"].includes(state)) return "disconnected";
  if (["connecting", "loading", "pairing"].includes(state)) return "connecting";
  return "unknown";
}
