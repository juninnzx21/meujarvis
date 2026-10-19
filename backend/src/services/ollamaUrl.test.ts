import { describe, expect, it } from "vitest";
import { normalizePrivateOllamaUrl } from "./ollamaUrl.js";

describe("normalizePrivateOllamaUrl", () => {
  it.each([
    ["http://localhost:11434/", "http://localhost:11434"],
    ["http://ollama:11434", "http://ollama:11434"],
    ["http://192.168.1.20:11434", "http://192.168.1.20:11434"],
    ["http://100.96.1.2:11434", "http://100.96.1.2:11434"],
    ["http://[::1]:11434", "http://[::1]:11434"]
  ])("accepts private endpoint %s", (input, expected) => {
    expect(normalizePrivateOllamaUrl(input)).toBe(expected);
  });

  it.each([
    "https://example.com",
    "http://8.8.8.8:11434",
    "http://169.254.169.254:11434",
    "http://[fe80::1]:11434",
    "http://localhost.attacker.test:11434",
    "http://user:password@192.168.1.20:11434",
    "http://192.168.1.20:11434/api/tags",
    "ftp://192.168.1.20:11434"
  ])("rejects unsafe endpoint %s", (input) => {
    expect(() => normalizePrivateOllamaUrl(input)).toThrow();
  });
});
