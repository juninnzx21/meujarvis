import type { FinancialDirection, FinancialTransactionType, StatementFileType, StatementImportRowStatus } from "@prisma/client";

export type ParsedStatementTransaction = {
  date: Date | null;
  amount: number | null;
  direction: FinancialDirection;
  type: FinancialTransactionType;
  originalDescription: string;
  description: string;
  memo?: string;
  fitId?: string;
  counterpartyName?: string;
  externalId?: string;
  balanceAfter?: number | null;
  status?: StatementImportRowStatus;
  raw: Record<string, unknown>;
};

export type ParsedStatement = {
  fileType: StatementFileType;
  bankName?: string;
  bankCode?: string;
  accountId?: string;
  accountType?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  finalBalance?: number | null;
  transactions: ParsedStatementTransaction[];
  metadata?: Record<string, unknown>;
};
