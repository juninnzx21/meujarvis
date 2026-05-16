import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Prisma, type FinancialDirection, type StatementFileType, type StatementImportRowStatus } from "@prisma/client";
import { parseStatementContent } from "../modules/finance/parsers/statementParser.js";
import type { ParsedStatement, ParsedStatementTransaction } from "../modules/finance/parsers/types.js";
import { prisma } from "../prisma/client.js";
import { redactSensitive } from "../utils/redact.js";
import { financeLedgerService } from "./financeLedgerService.js";
import { writeSystemLog } from "./systemLogService.js";

const storageDir = join(process.cwd(), "storage", "imports");
const whatsappStorageDir = join(storageDir, "whatsapp");
const maxUploadBytes = 8 * 1024 * 1024;
const allowedTypes: StatementFileType[] = ["csv", "ofx", "txt", "xlsx", "pdf"];

function safeFileName(fileName: string) {
  return basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160) || "extrato.txt";
}

export function detectStatementFileType(fileName: string): StatementFileType {
  const ext = extname(fileName).replace(".", "").toLowerCase();
  if (["csv", "ofx", "txt", "xlsx", "pdf"].includes(ext)) return ext as StatementFileType;
  return "unknown";
}

function normalizeAccount(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function formatAccountVariants(accountId?: string | null) {
  const clean = normalizeAccount(accountId);
  if (!clean) return [];
  return clean.length > 1 ? [clean, `${clean.slice(0, -1)}-${clean.slice(-1)}`] : [clean];
}

function isBancoInter(parsed: ParsedStatement) {
  const text = financeLedgerService.normalizeText(`${parsed.bankName ?? ""} ${parsed.bankCode ?? ""} ${parsed.accountType ?? ""}`);
  return parsed.bankCode === "077" || text.includes("inter") || text.includes("intermedium");
}

function statusFromCategorization(tx: ParsedStatementTransaction, duplicate: unknown, confidence: number): StatementImportRowStatus {
  if (duplicate) return "duplicate";
  if (tx.amount === null || !tx.date || tx.direction === "unknown") return "pending";
  return confidence >= 0.85 ? "approved" : "pending";
}

function safeRaw(tx: ParsedStatementTransaction) {
  return redactSensitive({
    ...tx.raw,
    fitId: tx.fitId,
    externalId: tx.externalId,
    source: "statement_import"
  }) as Prisma.InputJsonValue;
}

async function findOrCreateDetectedAccount(userId: string, parsed: ParsedStatement, explicitBankAccountId?: string, confirmedAccount?: boolean) {
  if (explicitBankAccountId) {
    return prisma.bankAccount.findFirstOrThrow({ where: { id: explicitBankAccountId, userId } });
  }

  const variants = formatAccountVariants(parsed.accountId);
  const preciseConditions = [
    parsed.bankCode && variants.length ? { bankCode: parsed.bankCode, accountNumber: { in: variants } } : undefined,
    variants.length ? { accountNumber: { in: variants } } : undefined
  ].filter(Boolean) as Prisma.BankAccountWhereInput[];
  const account = preciseConditions.length
    ? await prisma.bankAccount.findFirst({ where: { userId, OR: preciseConditions } })
    : await prisma.bankAccount.findFirst({
      where: {
        userId,
        OR: [
          { accountName: { contains: "PJ DO INTER", mode: "insensitive" } },
          { accountName: { contains: "Inter PJ", mode: "insensitive" } },
          { bankName: { contains: "Inter", mode: "insensitive" } }
        ]
      }
    });
  if (account) return account;

  if (isBancoInter(parsed) && parsed.accountId && confirmedAccount) {
    return financeLedgerService.createAccount(userId, {
      bankName: "Banco Inter",
      bankCode: "077",
      accountType: "business",
      accountName: "PJ DO INTER",
      accountNumber: normalizeAccount(parsed.accountId),
      currentBalance: parsed.finalBalance ?? 0
    });
  }
  return null;
}

async function buildRows(userId: string, parsed: ParsedStatement, bankAccountId?: string | null) {
  const rows = [];
  for (const tx of parsed.transactions) {
    const category = await financeLedgerService.categorize(userId, tx.description, tx.direction);
    const duplicate = bankAccountId && tx.date && tx.amount !== null
      ? await financeLedgerService.detectDuplicate(userId, bankAccountId, tx.date, new Prisma.Decimal(tx.amount), tx.originalDescription, tx.externalId)
      : null;
    rows.push({
      date: tx.date,
      description: tx.description.slice(0, 255),
      amount: tx.amount,
      direction: tx.direction,
      balanceAfter: tx.balanceAfter ?? null,
      categorySuggestion: category.category?.name ?? (category.reason === "review" ? "revisar" : undefined),
      categoryId: category.category?.id,
      status: statusFromCategorization(tx, duplicate, category.confidence),
      raw: safeRaw(tx)
    });
  }
  return rows;
}

function summarizeRows(rows: Array<{ amount: number | null; direction: FinancialDirection; status: StatementImportRowStatus }>) {
  const incomeRows = rows.filter((row) => row.direction === "in");
  const expenseRows = rows.filter((row) => row.direction === "out");
  const incomeTotal = incomeRows.reduce((total, row) => total.plus(row.amount ?? 0), new Prisma.Decimal(0));
  const expenseTotal = expenseRows.reduce((total, row) => total.plus(row.amount ?? 0), new Prisma.Decimal(0));
  return {
    incomeRows: incomeRows.length,
    expenseRows: expenseRows.length,
    pendingRows: rows.filter((row) => row.status === "pending").length,
    approvedRows: rows.filter((row) => row.status === "approved").length,
    duplicateRows: rows.filter((row) => row.status === "duplicate").length,
    incomeTotal: incomeTotal.toString(),
    expenseTotal: expenseTotal.toString()
  };
}

export const statementImportService = {
  async upload(userId: string, input: { fileName: string; content: string; bankAccountId?: string; source?: "panel" | "whatsapp"; confirmedAccount?: boolean }) {
    const fileType = detectStatementFileType(input.fileName);
    if (!allowedTypes.includes(fileType)) throw Object.assign(new Error("Formato de extrato nao suportado."), { statusCode: 400 });
    const bytes = Buffer.byteLength(input.content, "utf8");
    if (bytes > maxUploadBytes) throw Object.assign(new Error("Arquivo muito grande para importacao segura nesta fase."), { statusCode: 400 });
    if (fileType === "pdf" || fileType === "xlsx") {
      throw Object.assign(new Error("Nao consegui interpretar esse arquivo com seguranca. Envie OFX ou CSV. PDF fica apenas para conferencia manual."), { statusCode: 400 });
    }

    const targetDir = input.source === "whatsapp" ? whatsappStorageDir : storageDir;
    await mkdir(targetDir, { recursive: true });
    const name = safeFileName(input.fileName);
    const storedName = `${Date.now()}-${name}`;
    await writeFile(join(targetDir, storedName), input.content, "utf8");

    const parsed = parseStatementContent(fileType, input.content, input.fileName);
    const detectedAccount = await findOrCreateDetectedAccount(userId, parsed, input.bankAccountId, input.confirmedAccount);
    const rows = await buildRows(userId, parsed, detectedAccount?.id);
    const summary = summarizeRows(rows);

    const statement = await prisma.statementImport.create({
      data: {
        userId,
        bankAccountId: detectedAccount?.id,
        fileName: name,
        fileType,
        bankNameDetected: parsed.bankName,
        accountDetected: parsed.accountId,
        periodStart: parsed.periodStart ?? undefined,
        periodEnd: parsed.periodEnd ?? undefined,
        status: "review_required",
        totalRows: rows.length,
        duplicateRows: summary.duplicateRows,
        reviewRows: summary.pendingRows,
        metadata: {
          storedName,
          storage: input.source === "whatsapp" ? "whatsapp" : "panel",
          bytes,
          bankCode: parsed.bankCode,
          accountType: parsed.accountType,
          finalBalance: parsed.finalBalance,
          parser: typeof parsed.metadata?.parser === "string" ? parsed.metadata.parser : undefined,
          summary
        },
        rows: {
          create: rows.map((row) => ({
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
        }
      },
      include: { rows: true, bankAccount: true }
    });

    await writeSystemLog({
      userId,
      module: "finance",
      action: input.source === "whatsapp" ? "statement_whatsapp_upload" : "statement_upload",
      message: "Extrato enviado para revisao",
      metadata: {
        importId: statement.id,
        fileType,
        rowCount: rows.length,
        bankName: parsed.bankName,
        bankCode: parsed.bankCode,
        accountDetected: parsed.accountId ? "configured" : "absent",
        status: statement.status
      }
    });
    return statement;
  },

  async uploadFromWhatsApp(userId: string, input: { fileName: string; content: string; phone?: string; confirmedAccount?: boolean }) {
    return this.upload(userId, { ...input, source: "whatsapp", confirmedAccount: input.confirmedAccount });
  },

  async listImports(userId: string) {
    return prisma.statementImport.findMany({
      where: { userId },
      include: { bankAccount: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  },

  async getImport(userId: string, id: string) {
    return prisma.statementImport.findFirstOrThrow({
      where: { id, userId },
      include: { rows: { include: { category: true }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }, bankAccount: true }
    });
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
    const result = await prisma.statementImportRow.updateMany({
      where: { importId, status: { in: ["pending", "approved"] }, amount: { not: null }, direction: { not: "unknown" } },
      data: { status: "approved" }
    });
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
      const raw = (row.raw && typeof row.raw === "object" ? row.raw : {}) as Record<string, unknown>;
      const externalId = typeof raw.externalId === "string" ? raw.externalId : typeof raw.fitId === "string" ? raw.fitId : undefined;
      const tx = await financeLedgerService.createTransaction(userId, {
        bankAccountId: statement.bankAccountId,
        categoryId: row.categoryId,
        type: row.direction === "in" ? "income" : "expense",
        direction: row.direction === "in" ? "in" : "out",
        amount: row.amount.toString(),
        date: row.date.toISOString(),
        description: row.description,
        originalDescription: row.description,
        origin: "statement_import",
        transactionExternalId: externalId,
        source: "statement_import",
        status: "confirmed",
        metadata: { importId, rowId: row.id }
      });
      if (tx.status === "confirmed") importedRows += 1;
      await prisma.statementImportRow.update({ where: { id: row.id }, data: { status: tx.status === "duplicate" ? "duplicate" : "imported" } });
    }
    const updated = await prisma.statementImport.update({
      where: { id: importId },
      data: {
        status: "imported",
        importedRows,
        reviewRows: await prisma.statementImportRow.count({ where: { importId, status: "pending" } }),
        duplicateRows: await prisma.statementImportRow.count({ where: { importId, status: "duplicate" } })
      }
    });
    await writeSystemLog({ userId, module: "finance", action: "statement_import", message: "Extrato importado apos revisao", metadata: { importId, importedRows } });
    return updated;
  }
};
