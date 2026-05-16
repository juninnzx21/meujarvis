import { directionAndType, extractCounterparty, parseOfxDate, parsePtBrMoney } from "./helpers.js";
import type { ParsedStatement } from "./types.js";

function tag(block: string, name: string) {
  const xml = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1];
  if (xml !== undefined) return xml.trim();
  return block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() ?? "";
}

function blocks(content: string, name: string) {
  return [...content.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "gi"))].map((match) => match[1]);
}

export function parseOfxStatement(content: string): ParsedStatement {
  const normalized = content.replace(/\r/g, "");
  const bankId = tag(normalized, "BANKID") || undefined;
  const accountId = tag(normalized, "ACCTID") || undefined;
  const accountType = tag(normalized, "ACCTTYPE") || undefined;
  const periodStart = parseOfxDate(tag(normalized, "DTSTART"));
  const periodEnd = parseOfxDate(tag(normalized, "DTEND"));
  const finalBalance = parsePtBrMoney(tag(normalized, "BALAMT"));

  const transactions = blocks(normalized, "STMTTRN").map((block, index) => {
    const trnType = tag(block, "TRNTYPE");
    const amountValue = parsePtBrMoney(tag(block, "TRNAMT"));
    const amount = amountValue === null ? null : Math.abs(amountValue);
    const memo = tag(block, "MEMO") || tag(block, "NAME");
    const description = memo || trnType || `Lancamento OFX ${index + 1}`;
    const fitId = tag(block, "FITID") || undefined;
    const { direction, type } = directionAndType(description, amountValue, trnType);
    return {
      date: parseOfxDate(tag(block, "DTPOSTED")),
      amount,
      direction,
      type,
      originalDescription: description,
      description,
      memo,
      fitId,
      counterpartyName: extractCounterparty(description),
      externalId: fitId,
      balanceAfter: null,
      raw: {
        trnType,
        fitId,
        // Keep only compact metadata. The raw statement line/content is intentionally not stored.
        source: "ofx",
        index
      }
    };
  });

  return {
    fileType: "ofx",
    bankName: bankId === "077" ? "Banco Inter" : bankId ? `Banco ${bankId}` : undefined,
    bankCode: bankId,
    accountId,
    accountType,
    periodStart,
    periodEnd,
    finalBalance,
    transactions,
    metadata: { parser: "ofx", priority: 1 }
  };
}
