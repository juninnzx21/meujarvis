import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { financeIntegrationService } from "../../services/financeIntegrationService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const configSchema = z.object({
  apiUrl: z.string().url("Informe a URL do Controle Financeiro.").transform((value) => value.replace(/\/+$/, "")),
  token: z.string().optional().refine((value) => !value || !/^https?:\/\//i.test(value), "Token nao pode ser uma URL."),
  defaultAccountName: z.string().min(1).max(120).optional(),
  defaultAccountId: z.string().max(120).optional()
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

router.get("/status", asyncHandler(async (req, res) => res.json(await financeIntegrationService.status(req.user!.id))));
router.get("/config", asyncHandler(async (req, res) => res.json(await financeIntegrationService.status(req.user!.id))));
router.put("/config", validate(configSchema), asyncHandler(async (req, res) => {
  res.json(await financeIntegrationService.saveConfig(req.user!.id, req.body));
}));
router.delete("/config", asyncHandler(async (req, res) => res.json(await financeIntegrationService.clearConfig(req.user!.id))));
router.post("/test-connection", asyncHandler(async (req, res) => res.json(await financeIntegrationService.testConnection(req.user!.id))));
router.get("/accounts", asyncHandler(async (req, res) => res.json(await financeIntegrationService.listAccounts(req.user!.id))));
router.get("/summary/month", asyncHandler(async (req, res) => res.json(await financeIntegrationService.monthlySummary(req.user!.id))));
router.post("/transactions", validate(transactionSchema), asyncHandler(async (req, res) => {
  res.json(await financeIntegrationService.createTransaction(req.user!.id, req.body));
}));
router.post("/parse", validate(z.object({ text: z.string().min(3) })), asyncHandler(async (req, res) => {
  res.json({ parsed: financeIntegrationService.parseFinancialText(req.body.text) });
}));

export default router;
