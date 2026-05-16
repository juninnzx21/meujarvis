import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { financialAssistantService } from "../../services/financialAssistantService.js";
import { financeLedgerService } from "../../services/financeLedgerService.js";
import { financeIntegrationService } from "../../services/financeIntegrationService.js";
import { statementImportService } from "../../services/statementImportService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

function pathParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

const configSchema = z.object({
  apiUrl: z.string().url("Informe a URL do Controle Financeiro.").transform((value) => value.replace(/\/+$/, "")),
  token: z.string().optional().refine((value) => !value || !/^https?:\/\//i.test(value), "Token nao pode ser uma URL."),
  defaultAccountName: z.string().min(1).max(120).optional(),
  defaultAccountId: z.string().max(120).optional()
});

const authSchema = z.object({
  apiUrl: z.string().url("Informe a URL do Controle Financeiro.").transform((value) => value.replace(/\/+$/, "")),
  email: z.string().email("Informe o email do Controle Financeiro."),
  password: z.string().min(6, "Informe a senha do Controle Financeiro."),
  defaultAccountName: z.string().min(1).max(120).optional()
});

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  status: z.string().max(40).optional(),
  description: z.string().min(2).max(255),
  amount: z.coerce.number().positive(),
  financial_account_id: z.string().optional(),
  transaction_date: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().max(1000).optional()
});

const bankAccountSchema = z.object({
  bankName: z.string().min(2).max(120),
  bankCode: z.string().max(20).optional(),
  accountType: z.enum(["personal", "business", "savings", "checking", "credit", "other"]).default("checking"),
  accountName: z.string().min(2).max(120),
  agency: z.string().max(40).optional(),
  accountNumber: z.string().max(80).optional(),
  currentBalance: z.coerce.number().default(0)
});

const categorySchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["income", "expense", "transfer", "adjustment"]),
  color: z.string().max(40).optional(),
  icon: z.string().max(40).optional(),
  keywords: z.array(z.string().min(1).max(80)).default([])
});

const nativeTransactionSchema = z.object({
  bankAccountId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["income", "expense", "transfer", "adjustment"]),
  direction: z.enum(["in", "out"]).optional(),
  amount: z.coerce.number().positive(),
  date: z.string().optional(),
  description: z.string().min(2).max(255),
  originalDescription: z.string().max(255).optional(),
  origin: z.string().max(80).optional(),
  counterpartyName: z.string().max(120).optional(),
  documentNumber: z.string().max(120).optional(),
  transactionExternalId: z.string().max(160).optional(),
  source: z.enum(["manual", "chat", "statement_import", "automation"]).optional(),
  status: z.enum(["confirmed", "pending_review", "ignored", "duplicate"]).optional(),
  notes: z.string().max(1000).optional()
});

const uploadSchema = z.object({
  fileName: z.string().min(3).max(180),
  content: z.string().min(3),
  bankAccountId: z.string().optional(),
  confirmedAccount: z.boolean().optional()
});

const rowUpdateSchema = z.object({
  status: z.enum(["pending", "approved", "ignored", "duplicate", "error", "imported"]).optional(),
  categoryId: z.string().optional().nullable(),
  description: z.string().min(1).max(255).optional(),
  bankAccountId: z.string().optional()
});

router.get("/status", asyncHandler(async (req, res) => res.json(await financeIntegrationService.status(req.user!.id))));
router.get("/config", asyncHandler(async (req, res) => res.json(await financeIntegrationService.status(req.user!.id))));
router.put("/config", validate(configSchema), asyncHandler(async (req, res) => {
  res.json(await financeIntegrationService.saveConfig(req.user!.id, req.body));
}));
router.delete("/config", asyncHandler(async (req, res) => res.json(await financeIntegrationService.clearConfig(req.user!.id))));
router.post("/auth/login", validate(authSchema), asyncHandler(async (req, res) => res.json(await financeIntegrationService.authenticate(req.user!.id, req.body))));
router.delete("/auth", asyncHandler(async (req, res) => res.json(await financeIntegrationService.disconnect(req.user!.id))));
router.post("/test-connection", asyncHandler(async (req, res) => res.json(await financeIntegrationService.testConnection(req.user!.id))));
router.get("/accounts", asyncHandler(async (req, res) => res.json(await financeIntegrationService.listAccounts(req.user!.id))));
router.get("/summary/month", asyncHandler(async (req, res) => res.json(await financeIntegrationService.monthlySummary(req.user!.id))));
router.post("/transactions", asyncHandler(async (req, res) => {
  const native = nativeTransactionSchema.safeParse(req.body);
  if (native.success) {
    res.status(201).json({ transaction: await financeLedgerService.createTransaction(req.user!.id, native.data) });
    return;
  }
  const external = transactionSchema.parse(req.body);
  res.json(await financeIntegrationService.createTransaction(req.user!.id, external));
}));
router.post("/parse", validate(z.object({ text: z.string().min(3) })), asyncHandler(async (req, res) => {
  res.json({ parsed: financeIntegrationService.parseFinancialText(req.body.text) });
}));

router.get("/bank-accounts", asyncHandler(async (req, res) => {
  res.json({ accounts: await financeLedgerService.listAccounts(req.user!.id) });
}));
router.post("/bank-accounts", validate(bankAccountSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ account: await financeLedgerService.createAccount(req.user!.id, req.body) });
}));
router.put("/bank-accounts/:id", validate(bankAccountSchema.partial()), asyncHandler(async (req, res) => {
  const id = pathParam(req.params.id);
  await prisma.bankAccount.findFirstOrThrow({ where: { id, userId: req.user!.id } });
  const account = await prisma.bankAccount.update({ where: { id }, data: req.body });
  res.json({ account });
}));

router.get("/categories", asyncHandler(async (req, res) => {
  res.json({ categories: await financeLedgerService.listCategories(req.user!.id) });
}));
router.post("/categories", validate(categorySchema), asyncHandler(async (req, res) => {
  res.status(201).json({ category: await financeLedgerService.createCategory(req.user!.id, req.body) });
}));
router.put("/categories/:id", validate(categorySchema.partial()), asyncHandler(async (req, res) => {
  const id = pathParam(req.params.id);
  await prisma.financialCategory.findFirstOrThrow({ where: { id, userId: req.user!.id } });
  const category = await prisma.financialCategory.update({ where: { id }, data: req.body });
  res.json({ category });
}));

router.get("/ledger/transactions", asyncHandler(async (req, res) => {
  res.json({ transactions: await financeLedgerService.listTransactions(req.user!.id, req.query as Record<string, string>) });
}));
router.get("/transactions/duplicates", asyncHandler(async (req, res) => {
  res.json({ transactions: await financeLedgerService.listTransactions(req.user!.id, { status: "duplicate" }) });
}));

router.post("/assistant", validate(z.object({ content: z.string().min(2).max(1000) })), asyncHandler(async (req, res) => {
  const result = await financialAssistantService.process(req.user!.id, req.body.content);
  res.json(result ?? { reply: "Nao identifiquei um comando financeiro completo. Informe entrada, saida, valor e conta.", intent: "finance.unknown" });
}));

router.post("/imports/upload", validate(uploadSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ import: await statementImportService.upload(req.user!.id, req.body) });
}));
router.post("/import/upload", validate(uploadSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ import: await statementImportService.upload(req.user!.id, req.body) });
}));
router.post("/import/whatsapp", validate(uploadSchema.extend({ phone: z.string().optional() })), asyncHandler(async (req, res) => {
  res.status(201).json({ import: await statementImportService.uploadFromWhatsApp(req.user!.id, req.body) });
}));
router.get("/imports", asyncHandler(async (req, res) => {
  res.json({ imports: await statementImportService.listImports(req.user!.id) });
}));
router.get("/imports/:id", asyncHandler(async (req, res) => {
  res.json({ import: await statementImportService.getImport(req.user!.id, pathParam(req.params.id)) });
}));
router.get("/imports/:id/rows", asyncHandler(async (req, res) => {
  const statement = await statementImportService.getImport(req.user!.id, pathParam(req.params.id));
  res.json({ rows: statement.rows });
}));
router.patch("/imports/:id/rows/:rowId", validate(rowUpdateSchema), asyncHandler(async (req, res) => {
  res.json({ row: await statementImportService.updateRow(req.user!.id, pathParam(req.params.id), pathParam(req.params.rowId), req.body) });
}));
router.post("/imports/:id/approve-all", asyncHandler(async (req, res) => {
  res.json(await statementImportService.approveAll(req.user!.id, pathParam(req.params.id)));
}));
router.post("/imports/:id/import-approved", asyncHandler(async (req, res) => {
  res.json({ import: await statementImportService.importApproved(req.user!.id, pathParam(req.params.id)) });
}));

router.get("/reports/summary", asyncHandler(async (req, res) => res.json(await financeLedgerService.summary(req.user!.id))));
router.get("/reports/monthly", asyncHandler(async (req, res) => res.json(await financeLedgerService.summary(req.user!.id))));
router.get("/reports/categories", asyncHandler(async (req, res) => res.json({ categories: await financeLedgerService.categoriesReport(req.user!.id) })));
router.get("/reports/accounts", asyncHandler(async (req, res) => res.json({ accounts: await financeLedgerService.listAccounts(req.user!.id) })));
router.get("/reports/cashflow", asyncHandler(async (req, res) => res.json({ cashflow: await financeLedgerService.cashflow(req.user!.id) })));

export default router;
