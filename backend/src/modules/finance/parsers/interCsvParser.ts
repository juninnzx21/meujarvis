import { deterministicId, directionAndType, extractCounterparty, normalizeText, parseBrDate, parsePtBrMoney, splitDelimitedLine } from "./helpers.js";
import type { ParsedStatement } from "./types.js";

export function parseInterCsvStatement(content: string): ParsedStatement {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let accountId: string | undefined;
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  let finalBalance: number | null = null;
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const cells = splitDelimitedLine(lines[i], ";");
    const key = normalizeText(cells[0] ?? "");
    const value = cells.slice(1).join(";").trim();
    if (key === "conta" && value) accountId = value.replace(/\D/g, "") || value;
    if (key === "periodo") {
      const [start, end] = value.split(/\s+a\s+/i);
      periodStart = start ? parseBrDate(start) : null;
      periodEnd = end ? parseBrDate(end) : null;
    }
    if (key === "saldo") finalBalance = parsePtBrMoney(value);
    if (normalizeText(lines[i]).includes("data lancamento") && normalizeText(lines[i]).includes("historico")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) {
    headerIndex = lines.findIndex((line) => normalizeText(line).includes("data") && normalizeText(line).includes("valor"));
  }
  if (headerIndex < 0) {
    return { fileType: "csv", transactions: [], metadata: { parser: "inter_csv", error: "header_not_found" } };
  }

  const header = splitDelimitedLine(lines[headerIndex], ";").map(normalizeText);
  const dateIndex = header.findIndex((item) => item.includes("data"));
  const historyIndex = header.findIndex((item) => item.includes("historico"));
  const descriptionIndex = header.findIndex((item) => item.includes("descricao"));
  const amountIndex = header.findIndex((item) => item.includes("valor"));
  const balanceIndex = header.findIndex((item) => item.includes("saldo"));

  const transactions = lines.slice(headerIndex + 1).map((line, rowIndex) => {
    const cells = splitDelimitedLine(line, ";");
    const history = cells[historyIndex] ?? "";
    const descriptionPart = cells[descriptionIndex] ?? "";
    const description = [history, descriptionPart].filter(Boolean).join(" - ").trim() || `Lancamento CSV ${rowIndex + 1}`;
    const signedAmount = amountIndex >= 0 ? parsePtBrMoney(cells[amountIndex] ?? "") : null;
    const amount = signedAmount === null ? null : Math.abs(signedAmount);
    const { direction, type } = directionAndType(description, signedAmount);
    const date = dateIndex >= 0 ? parseBrDate(cells[dateIndex] ?? "") : null;
    const externalId = deterministicId([accountId, date?.toISOString().slice(0, 10), signedAmount, history, descriptionPart, rowIndex]);
    return {
      date,
      amount,
      direction,
      type,
      originalDescription: description,
      description,
      memo: descriptionPart || history,
      counterpartyName: extractCounterparty(description),
      externalId,
      balanceAfter: balanceIndex >= 0 ? parsePtBrMoney(cells[balanceIndex] ?? "") : null,
      raw: {
        source: "inter_csv",
        externalId,
        rowIndex
      }
    };
  }).filter((item) => item.amount !== null || item.description);

  return {
    fileType: "csv",
    bankName: "Banco Inter",
    bankCode: "077",
    accountId,
    accountType: "CHECKING",
    periodStart,
    periodEnd,
    finalBalance,
    transactions,
    metadata: { parser: "inter_csv", priority: 2 }
  };
}
