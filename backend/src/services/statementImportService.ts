import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Prisma, type FinancialDirection, type StatementFileType, type StatementImportRowStatus } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { financeLedgerService } from "./financeLedgerService.js";
import { writeSystemLog } from "./systemLogService.js";

const storageDir = join(process.cwd(), "storage", "imports");
const maxUploadBytes = 2 * 1024 * 1024;
const allowedTypes: StatementFileType[] = ["csv", "ofx", "txt", "xlsx", "pdf"];

function safeFileName(fileName: string) {
  return basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160) || "extrato.txt";
}

function detectFileType(fileName: string): StatementFileType {
  const ext = extname(fileName).replace(".", "").toLowerCase();
  if (["csv", "ofx", "txt", "xlsx", "pdf"].includes(ext)) return ext as StatementFileType;
  return "unknown";
}

function parseMoney(value: string) {
  const clean = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string) {
  const text = value.trim();
  const br = text.match(/^(\d{2})[/-](\d{2})[/-](\d{2,4})$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return new Date(`${year}-${br[2]}-${br[1]}T12:00:00.000Z`);
  }
  const iso = new Date(text);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted;
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

function normalizeHeader(value: string) {
  return financeLedgerService.normalizeText(value);
}

function directionFromText(description: string, amount: number | null): FinancialDirection {
  const text = financeLedgerService.normalizeText(description);
  if (text.includes("pix recebido") || text.includes("recebimento") || text.includes("credito") || text.includes("estorno")) return "in";
  if (text.includes("pix enviado") || text.includes("pagamento") || text.includes("debito") || text.includes("tarifa") || text.includes("boleto")) return "out";
  if (amount !== null) return amount >= 0 ? "in" : "out";
  return "unknown";
}

function detectBank(content: string, fileName: string) {
  const text = financeLedgerService.normalizeText(`${fileName} ${content.slice(0, 4000)}`);
  if (text.includes("banco inter") || text.includes("inter pj") || text.includes("conta digital pj") || text.includes("inter empresas")) {
    return { bankNameDetected: "Banco Inter", accountDetected: text.includes("pj") ? "Inter PJ" : "Inter" };
  }
  return { bankNameDetected: undefined, accountDetected: undefined };
}

async function parseDelimitedRows(userId: string, content: string, bankAccountId?: string) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const dateIndex = header.findIndex((item) => ["data", "dt", "date"].includes(item) || item.includes("data lancamento"));
  const descriptionIndex = header.findIndex((item) => item.includes("descricao") || item.includes("historico") || item.includes("lancamento") || item.includes("descri"));
  const amountIndex = header.findIndex((item) => item === "valor" || item.includes("amount") || item.includes("vlr"));
  const creditIndex = header.findIndex((item) => item.includes("credito"));
  const debitIndex = header.findIndex((item) => item.includes("debito"));
  const balanceIndex = header.findIndex((item) => item.includes("saldo"));
  const externalIndex = header.findIndex((item) => item.includes("id") || item.includes("identificador"));

  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);
    const description = cells[descriptionIndex] || cells[1] || line;
    const rawAmount = amountIndex >= 0 ? parseMoney(cells[amountIndex] ?? "") : null;
    const debit = debitIndex >= 0 ? parseMoney(cells[debitIndex] ?? "") : null;
    const credit = creditIndex >= 0 ? parseMoney(cells[creditIndex] ?? "") : null;
    const signedAmount = rawAmount ?? (credit && credit > 0 ? credit : debit && debit > 0 ? -debit : null);
    const amount = signedAmount === null ? null : Math.abs(signedAmount);
    const direction = directionFromText(description, signedAmount);
    const date = dateIndex >= 0 ? parseDate(cells[dateIndex] ?? "") : null;
    const category = await financeLedgerService.categorize(userId, description, direction);
    const duplicate = bankAccountId && date && amount !== null
      ? await financeLedgerService.detectDuplicate(userId, bankAccountId, date, new Prisma.Decimal(amount), description, externalIndex >= 0 ? cells[externalIndex] : undefined)
      : null;
    rows.push({
      date,
      description,
      amount,
      direction,
      balanceAfter: balanceIndex >= 0 ? parseMoney(cells[balanceIndex] ?? "") : null,
      categorySuggestion: category.category?.name,
      categoryId: category.category?.id,
      status: duplicate ? "duplicate" as StatementImportRowStatus : category.confidence >= 0.65 && amount !== null && direction !== "unknown" ? "pending" as StatementImportRowStatus : "pending" as StatementImportRowStatus,
      raw: { cells, externalId: externalIndex >= 0 ? cells[externalIndex] : undefined }
    });
  }
  return rows;
}

export const statementImportService = {
  async upload(userId: string, input: { fileName: string; content: string; bankAccountId?: string }) {
    const fileType = detectFileType(input.fileName);
    if (!allowedTypes.includes(fileType)) throw Object.assign(new Error("Formato de extrato nao suportado."), { statusCode: 400 });
    const bytes = Buffer.byteLength(input.content, "utf8");
    if (bytes > maxUploadBytes) throw Object.assign(new Error("Arquivo muito grande para importacao segura nesta fase."), { statusCode: 400 });
    if (fileType === "pdf" || fileType === "xlsx") {
      throw Object.assign(new Error("Nao consegui interpretar esse arquivo com seguranca. Envie CSV/OFX/TXT ou revise manualmente."), { statusCode: 400 });
    }

    await mkdir(storageDir, { recursive: true });
    const name = safeFileName(input.fileName);
    const storedName = `${Date.now()}-${name}`;
    await writeFile(join(storageDir, storedName), input.content, "utf8");

    const detected = detectBank(input.content, input.fileName);
    const statement = await prisma.statementImport.create({
      data: {
        userId,
        bankAccountId: input.bankAccountId,
        fileName: name,
        fileType,
        bankNameDetected: detected.bankNameDetected,
        accountDetected: detected.accountDetected,
        status: "uploaded",
        metadata: { storedName, bytes }
      }
    });

    const rows = await parseDelimitedRows(userId, input.content, input.bankAccountId);
    await prisma.statementImportRow.createMany({
      data: rows.map((row) => ({
        importId: statement.id,
        date: row.date,
        description: row.description,
        amount: row.amount,
        direction: row.direction,
        balanceAfter: row.balanceAfter,
        categorySuggestion: row.categorySuggestion,
        categoryId: row.categoryId,
        status: row.status,
        raw: row.raw
      }))
    });
    const updated = await prisma.statementImport.update({
      where: { id: statement.id },
      data: {
        status: "review_required",
        totalRows: rows.length,
        duplicateRows: rows.filter((row) => row.status === "duplicate").length,
        reviewRows: rows.filter((row) => row.status === "pending").length
      },
      include: { rows: true, bankAccount: true }
    });
    await writeSystemLog({ userId, module: "finance", action: "statement_upload", message: "Extrato enviado para revisao", metadata: { importId: statement.id, fileType, rows: rows.length, bankNameDetected: detected.bankNameDetected } });
    return updated;
  },

  async getImport(userId: string, id: string) {
    return prisma.statementImport.findFirstOrThrow({ where: { id, userId }, include: { rows: { include: { category: true }, orderBy: { createdAt: "asc" } }, bankAccount: true } });
  },

  async updateRow(userId: string, importId: string, rowId: string, input: { status?: StatementImportRowStatus; categoryId?: string | null; description?: string; bankAccountId?: string }) {
    await prisma.statementImport.findFirstOrThrow({ where: { id: importId, userId } });
    const row = await prisma.statementImportRow.update({
      where: { id: rowId },
      data: { status: input.status, categoryId: input.categoryId, description: input.description }
    });
    if (input.bankAccountId) await prisma.statementImport.update({ where: { id: importId }, data: { bankAccountId: input.bankAccountId } });
    return row;
  },

  async approveAll(userId: string, importId: string) {
    await prisma.statementImport.findFirstOrThrow({ where: { id: importId, userId } });
    const result = await prisma.statementImportRow.updateMany({ where: { importId, status: "pending", amount: { not: null }, direction: { not: "unknown" } }, data: { status: "approved" } });
    await writeSystemLog({ userId, module: "finance", action: "statement_approve_all", message: "Linhas de extrato aprovadas para importacao", metadata: { importId, count: result.count } });
    return result;
  },

  async importApproved(userId: string, importId: string) {
    const statement = await this.getImport(userId, importId);
    if (!statement.bankAccountId) throw Object.assign(new Error("Escolha uma conta bancaria antes de importar."), { statusCode: 400 });
    const rows = statement.rows.filter((row) => row.status === "approved" && row.amount && row.date && row.direction !== "unknown");
    if (!rows.length) throw Object.assign(new Error("Nao ha linhas aprovadas para importar."), { statusCode: 400 });

    let importedRows = 0;
    for (const row of rows) {
      if (!row.amount || !row.date || row.direction === "unknown") continue;
      const tx = await financeLedgerService.createTransaction(userId, {
        bankAccountId: statement.bankAccountId,
        categoryId: row.categoryId,
        type: row.direction === "in" ? "income" : "expense",
        direction: row.direction === "in" ? "in" : "out",
        amount: row.amount.toString(),
        date: row.date!.toISOString(),
        description: row.description,
        originalDescription: row.description,
        origin: "statement_import",
        source: "statement_import",
        status: "confirmed",
        metadata: { importId, rowId: row.id }
      });
      if (tx.status === "confirmed") importedRows += 1;
      await prisma.statementImportRow.update({ where: { id: row.id }, data: { status: tx.status === "duplicate" ? "duplicate" : "imported" } });
    }
    const updated = await prisma.statementImport.update({
      where: { id: importId },
      data: { status: "imported", importedRows, reviewRows: await prisma.statementImportRow.count({ where: { importId, status: "pending" } }), duplicateRows: await prisma.statementImportRow.count({ where: { importId, status: "duplicate" } }) }
    });
    await writeSystemLog({ userId, module: "finance", action: "statement_import", message: "Extrato importado apos revisao", metadata: { importId, importedRows } });
    return updated;
  }
};
