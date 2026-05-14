const sensitiveKeys = [/authorization/i, /cookie/i, /password/i, /passwordHash/i, /token/i, /api[-_]?key/i, /secret/i, /credential/i];

export function redactSensitive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
      .replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED_API_KEY]");
  }
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sensitiveKeys.some((pattern) => pattern.test(key)) ? "[REDACTED]" : redactSensitive(item)
      ])
    );
  }
  return value;
}
