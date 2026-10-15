export type TtsQuota = { status: "available" | "exhausted" | "unknown" | "not_configured"; remaining: number | null; limit: number | null; used: number | null; message: string };

const unavailable = (message: string): TtsQuota => ({ status: "unknown", remaining: null, limit: null, used: null, message });

export function parseFishAudioQuota(data: unknown): TtsQuota {
  const response = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const hasFreeCredit = response.has_free_credit === true;
  const credit = Number(response.credit);
  if (hasFreeCredit) {
    return { status: "available", remaining: Number.isFinite(credit) ? Math.max(0, credit) : null, limit: null, used: null, message: "Crédito gratuito disponível" };
  }
  if (!Number.isFinite(credit)) return unavailable("A API não informou os créditos");
  return { status: credit > 0 ? "available" : "exhausted", remaining: Math.max(0, credit), limit: null, used: null, message: "Créditos Fish Audio" };
}
