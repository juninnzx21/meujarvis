const DEFAULT_TIMEOUT_MS = 2_000;

export type PiperHealth = {
  status: "available" | "unavailable" | "not_configured";
  model?: string;
  latencyMs?: number;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export async function checkPiperHealth(baseUrl: string, fetcher: typeof fetch = fetch): Promise<PiperHealth> {
  const normalizedUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedUrl) return { status: "not_configured" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetcher(`${normalizedUrl}/health`, { signal: controller.signal });
    if (!response.ok) return { status: "unavailable", latencyMs: Date.now() - startedAt };
    const payload = await response.json() as { status?: unknown; model?: unknown };
    if (payload.status !== "ok") return { status: "unavailable", latencyMs: Date.now() - startedAt };
    return {
      status: "available",
      ...(typeof payload.model === "string" ? { model: payload.model } : {}),
      latencyMs: Date.now() - startedAt
    };
  } catch {
    return { status: "unavailable", latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

export async function synthesizeWithPiper(text: string, baseUrl: string, fetcher: typeof fetch = fetch): Promise<Buffer> {
  const normalizedUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedUrl) throw new Error("O serviço Piper não está configurado.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetcher(`${normalizedUrl}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/wav" },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`O motor Piper respondeu HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "audio/wav" && contentType !== "audio/x-wav") throw new Error("O motor Piper retornou um formato de áudio inválido.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 44 || bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WAVE") {
      throw new Error("O motor Piper retornou um WAV inválido.");
    }
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}
