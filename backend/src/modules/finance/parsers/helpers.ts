import { createHash } from "node:crypto";
import type { FinancialDirection, FinancialTransactionType } from "@prisma/client";

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parsePtBrMoney(value: string) {
  const clean = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!clean || clean === "-" || clean === ".") return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBrDate(value: string) {
  const text = value.trim();
  const br = text.match(/^(\d{2})[/-](\d{2})[/-](\d{2,4})$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return new Date(`${year}-${br[2]}-${br[1]}T12:00:00.000Z`);
  }
  const iso = new Date(text);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function parseOfxDate(value: string) {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
}

export function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === "\"") {
      if (quoted && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function directionAndType(description: string, signedAmount: number | null, trnType?: string): { direction: FinancialDirection; type: FinancialTransactionType } {
  const text = normalizeText(`${trnType ?? ""} ${description}`);
  let direction: FinancialDirection = "unknown";
  if (signedAmount !== null) direction = signedAmount >= 0 ? "in" : "out";
  if (text.includes("credit") || text.includes("pix recebido") || text.includes("recebimento") || text.includes("estorno") || text.includes("resgate cdb")) direction = "in";
  if (text.includes("debit") || text.includes("payment") || text.includes("pix enviado") || text.includes("pagamento") || text.includes("tarifa") || text.includes("compra no debito")) direction = "out";

  let type: FinancialTransactionType = direction === "in" ? "income" : direction === "out" ? "expense" : "adjustment";
  if (text.includes("aplicacao cdb") || text.includes("resgate cdb") || text.includes("transferencia entre contas") || text.includes("conta propria")) type = "transfer";
  return { direction, type };
}

export function deterministicId(parts: Array<string | number | null | undefined>) {
  return createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("|"))
    .digest("hex");
}

export function extractCounterparty(description: string) {
  const text = description.replace(/\s+/g, " ").trim();
  const pix = text.match(/pix (?:recebido|enviado).*?(?:de|para)\s+(.+)$/i);
  if (pix?.[1]) return pix[1].trim().slice(0, 120);
  return undefined;
}
