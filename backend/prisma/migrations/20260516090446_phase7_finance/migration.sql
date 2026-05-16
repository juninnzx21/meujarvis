-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('personal', 'business', 'savings', 'checking', 'credit', 'other');

-- CreateEnum
CREATE TYPE "FinancialCategoryType" AS ENUM ('income', 'expense', 'transfer', 'adjustment');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('income', 'expense', 'transfer', 'adjustment');

-- CreateEnum
CREATE TYPE "FinancialDirection" AS ENUM ('in', 'out', 'unknown');

-- CreateEnum
CREATE TYPE "FinancialTransactionSource" AS ENUM ('manual', 'chat', 'statement_import', 'automation');

-- CreateEnum
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('confirmed', 'pending_review', 'ignored', 'duplicate');

-- CreateEnum
CREATE TYPE "StatementFileType" AS ENUM ('csv', 'ofx', 'pdf', 'txt', 'xlsx', 'unknown');

-- CreateEnum
CREATE TYPE "StatementImportStatus" AS ENUM ('uploaded', 'parsed', 'review_required', 'imported', 'failed');

-- CreateEnum
CREATE TYPE "StatementImportRowStatus" AS ENUM ('pending', 'approved', 'ignored', 'duplicate', 'error', 'imported');

-- CreateEnum
CREATE TYPE "AssistantDraftActionType" AS ENUM ('financial_transaction', 'bank_account', 'statement_import');

-- CreateEnum
CREATE TYPE "AssistantDraftActionStatus" AS ENUM ('collecting', 'awaiting_confirmation', 'completed', 'canceled');

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT,
    "accountType" "BankAccountType" NOT NULL DEFAULT 'checking',
    "accountName" TEXT NOT NULL,
    "agency" TEXT,
    "accountNumber" TEXT,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialCategoryType" NOT NULL,
    "parentId" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "keywords" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "type" "FinancialTransactionType" NOT NULL,
    "direction" "FinancialDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "originalDescription" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "counterpartyName" TEXT,
    "documentNumber" TEXT,
    "transactionExternalId" TEXT,
    "source" "FinancialTransactionSource" NOT NULL DEFAULT 'manual',
    "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" "StatementFileType" NOT NULL,
    "bankNameDetected" TEXT,
    "accountDetected" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "status" "StatementImportStatus" NOT NULL DEFAULT 'uploaded',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "reviewRows" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementImportRow" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2),
    "direction" "FinancialDirection" NOT NULL DEFAULT 'unknown',
    "balanceAfter" DECIMAL(14,2),
    "categorySuggestion" TEXT,
    "categoryId" TEXT,
    "status" "StatementImportRowStatus" NOT NULL DEFAULT 'pending',
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatementImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matchText" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "direction" "FinancialDirection",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantDraftAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AssistantDraftActionType" NOT NULL,
    "status" "AssistantDraftActionStatus" NOT NULL DEFAULT 'collecting',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantDraftAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_userId_bankName_accountName_idx" ON "BankAccount"("userId", "bankName", "accountName");

-- CreateIndex
CREATE INDEX "FinancialCategory_userId_type_idx" ON "FinancialCategory"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_userId_name_type_key" ON "FinancialCategory"("userId", "name", "type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_userId_date_idx" ON "FinancialTransaction"("userId", "date");

-- CreateIndex
CREATE INDEX "FinancialTransaction_bankAccountId_date_idx" ON "FinancialTransaction"("bankAccountId", "date");

-- CreateIndex
CREATE INDEX "FinancialTransaction_transactionExternalId_idx" ON "FinancialTransaction"("transactionExternalId");

-- CreateIndex
CREATE INDEX "StatementImport_userId_status_idx" ON "StatementImport"("userId", "status");

-- CreateIndex
CREATE INDEX "StatementImportRow_importId_status_idx" ON "StatementImportRow"("importId", "status");

-- CreateIndex
CREATE INDEX "FinancialRule_userId_active_idx" ON "FinancialRule"("userId", "active");

-- CreateIndex
CREATE INDEX "AssistantDraftAction_userId_status_type_idx" ON "AssistantDraftAction"("userId", "status", "type");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementImport" ADD CONSTRAINT "StatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementImport" ADD CONSTRAINT "StatementImport_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementImportRow" ADD CONSTRAINT "StatementImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementImportRow" ADD CONSTRAINT "StatementImportRow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRule" ADD CONSTRAINT "FinancialRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRule" ADD CONSTRAINT "FinancialRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantDraftAction" ADD CONSTRAINT "AssistantDraftAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
