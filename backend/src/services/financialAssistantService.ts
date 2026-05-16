import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { financeLedgerService } from "./financeLedgerService.js";
import { writeSystemLog } from "./systemLogService.js";

type DraftPayload = {
  step?: "account" | "create_account" | "initial_balance" | "description" | "confirmation";
  type?: "income" | "expense" | "transfer" | "adjustment";
  direction?: "in" | "out";
  amount?: number;
  bankAccountId?: string;
  accountQuery?: string;
  description?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  confidence?: number;
};

function normalize(value: string) {
  return financeLedgerService.normalizeText(value);
}

function parseAmount(content: string) {
  const match = content.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{2}))?/i);
  if (!match) return undefined;
  const value = Number(`${match[1].replace(/\./g, "")}.${match[2] ?? "00"}`);
  return Number.isFinite(value) ? value : undefined;
}

function detectType(content: string): Pick<DraftPayload, "type" | "direction"> | null {
  const text = normalize(content);
  if (/(entrada|recebid|caiu|credito|adicionar saldo|subir uma entrada)/.test(text)) return { type: "income", direction: "in" };
  if (/(saida|gasto|saiu|debito|pagamento|desconto|lancar gasto)/.test(text)) return { type: "expense", direction: "out" };
  if (/transferencia/.test(text)) return { type: "transfer", direction: "out" };
  return null;
}

function detectAccountText(content: string) {
  const text = content.match(/(?:conta|banco)\s+(?:do|da|de)?\s*([a-z0-9\s]+)$/i)?.[1] ?? "";
  if (text) return text.trim();
  if (/inter/i.test(content)) return /pj/i.test(content) ? "Inter PJ" : "Inter";
  if (/nubank/i.test(content)) return "Nubank";
  return undefined;
}

function isYes(content: string) {
  return /^(sim|s|confirmo|confirmar|pode salvar|salvar|ok|isso)$/i.test(content.trim());
}

function isNo(content: string) {
  return /^(nao|não|n|cancelar|cancela)$/i.test(content.trim());
}

async function saveDraft(userId: string, payload: DraftPayload, status: "collecting" | "awaiting_confirmation" = "collecting") {
  const existing = await prisma.assistantDraftAction.findFirst({
    where: { userId, type: "financial_transaction", status: { in: ["collecting", "awaiting_confirmation"] } },
    orderBy: { updatedAt: "desc" }
  });
  if (existing) {
    return prisma.assistantDraftAction.update({ where: { id: existing.id }, data: { payload: payload as Prisma.InputJsonValue, status } });
  }
  return prisma.assistantDraftAction.create({ data: { userId, type: "financial_transaction", status, payload: payload as Prisma.InputJsonValue } });
}

function formatMoney(value: Prisma.Decimal | number | string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const financialAssistantService = {
  isFinancialCommand(content: string) {
    const text = normalize(content);
    return /(entrada|saida|gasto|recebi|recebido|saiu|desconto|saldo|conta|banco|fluxo de caixa|quanto entrou|quanto saiu|sem categoria|duplicad)/.test(text);
  },

  async process(userId: string, content: string) {
    const existingDraft = await prisma.assistantDraftAction.findFirst({
      where: { userId, type: "financial_transaction", status: { in: ["collecting", "awaiting_confirmation"] } },
      orderBy: { updatedAt: "desc" }
    });
    if (existingDraft) return this.continueDraft(userId, existingDraft.id, existingDraft.payload as DraftPayload, content);

    const report = await this.answerReport(userId, content);
    if (report) return report;

    const type = detectType(content);
    const amount = parseAmount(content);
    if (!type || !amount) return null;

    const accountText = detectAccountText(content);
    const payload: DraftPayload = { ...type, amount, accountQuery: accountText };
    if (!accountText) {
      payload.step = "account";
      await saveDraft(userId, payload);
      return { reply: "Qual banco ou conta deseja usar? Ex: Inter PJ, Nubank, Caixa, Carteira, etc.", intent: "finance.collect_account" };
    }
    const account = await financeLedgerService.findAccount(userId, accountText);
    if (!account) {
      payload.step = "create_account";
      await saveDraft(userId, payload);
      return { reply: `Essa conta "${accountText}" ainda nao existe. Deseja criar agora?`, intent: "finance.create_account_confirmation" };
    }
    payload.bankAccountId = account.id;
    payload.step = "description";
    await saveDraft(userId, payload);
    return { reply: type.direction === "in" ? "Qual foi a origem dessa entrada? Ex: cliente, venda, servico, reembolso, transferencia." : "Qual foi o motivo ou destino dessa saida? Ex: fornecedor, servidor, imposto, tarifa, compra.", intent: "finance.collect_description" };
  },

  async continueDraft(userId: string, draftId: string, payload: DraftPayload, content: string) {
    if (isNo(content)) {
      await prisma.assistantDraftAction.update({ where: { id: draftId }, data: { status: "canceled" } });
      return { reply: "Tudo bem, cancelei esse lancamento financeiro.", intent: "finance.canceled" };
    }

    if (payload.step === "account") {
      payload.accountQuery = content.trim();
      const account = await financeLedgerService.findAccount(userId, payload.accountQuery);
      if (!account) {
        payload.step = "create_account";
        await saveDraft(userId, payload);
        return { reply: `Essa conta "${payload.accountQuery}" ainda nao existe. Deseja criar agora?`, intent: "finance.create_account_confirmation" };
      }
      payload.bankAccountId = account.id;
      payload.step = "description";
      await saveDraft(userId, payload);
      return { reply: payload.direction === "in" ? "Qual foi a origem dessa entrada?" : "Qual foi o motivo ou destino dessa saida?", intent: "finance.collect_description" };
    }

    if (payload.step === "create_account") {
      if (!isYes(content)) {
        return { reply: "Para continuar, confirme se deseja criar a conta ou informe outra conta ja cadastrada.", intent: "finance.waiting_account_confirmation" };
      }
      payload.step = "initial_balance";
      await saveDraft(userId, payload);
      return { reply: "Qual saldo atual ou saldo inicial dessa conta? Pode responder 0 se ainda nao souber.", intent: "finance.collect_initial_balance" };
    }

    if (payload.step === "initial_balance") {
      const balance = parseAmount(content) ?? 0;
      const account = await financeLedgerService.createAccount(userId, {
        bankName: payload.accountQuery ?? "Conta",
        accountName: payload.accountQuery ?? "Conta financeira",
        accountType: normalize(payload.accountQuery ?? "").includes("pj") ? "business" : "checking",
        currentBalance: balance
      });
      payload.bankAccountId = account.id;
      payload.step = "description";
      await saveDraft(userId, payload);
      return { reply: "Conta criada. Agora me diga a origem da entrada ou o motivo/destino da saida.", intent: "finance.collect_description" };
    }

    if (payload.step === "description") {
      payload.description = content.trim();
      const suggestion = await financeLedgerService.categorize(userId, payload.description, payload.direction ?? "unknown");
      payload.categoryId = suggestion.category?.id ?? null;
      payload.categoryName = suggestion.category?.name ?? "Revisar";
      payload.confidence = suggestion.confidence;
      payload.step = "confirmation";
      const account = payload.bankAccountId ? await prisma.bankAccount.findUnique({ where: { id: payload.bankAccountId } }) : null;
      const after = account && payload.amount
        ? (payload.direction === "in" ? new Prisma.Decimal(account.currentBalance).plus(payload.amount) : new Prisma.Decimal(account.currentBalance).minus(payload.amount))
        : null;
      await saveDraft(userId, payload, "awaiting_confirmation");
      return {
        reply: `Resumo antes de salvar:\nConta: ${account?.accountName ?? "nao informada"}\nTipo: ${payload.direction === "in" ? "entrada" : "saida"}\nValor: ${formatMoney(payload.amount ?? 0)}\nOrigem/destino: ${payload.description}\nCategoria sugerida: ${payload.categoryName}${suggestion.confidence < 0.65 ? " (revisar)" : ""}\nSaldo estimado depois: ${after ? formatMoney(after) : "indisponivel"}\nConfirmar lancamento?`,
        intent: "finance.awaiting_confirmation",
        data: { payload }
      };
    }

    if (payload.step === "confirmation") {
      if (!isYes(content)) return { reply: "Responda 'sim' para confirmar ou 'cancelar' para descartar esse lancamento.", intent: "finance.awaiting_confirmation" };
      if (!payload.bankAccountId || !payload.amount || !payload.type || !payload.direction || !payload.description) {
        await prisma.assistantDraftAction.update({ where: { id: draftId }, data: { status: "canceled" } });
        return { reply: "Nao consegui confirmar porque faltam dados. Vamos iniciar novamente.", intent: "finance.invalid_draft" };
      }
      const transaction = await financeLedgerService.createTransaction(userId, {
        bankAccountId: payload.bankAccountId,
        categoryId: payload.categoryId,
        type: payload.type,
        direction: payload.direction,
        amount: payload.amount,
        description: payload.description,
        originalDescription: payload.description,
        origin: "chat",
        source: "chat",
        status: (payload.confidence ?? 0) >= 0.65 ? "confirmed" : "pending_review"
      });
      await prisma.assistantDraftAction.update({ where: { id: draftId }, data: { status: "completed" } });
      await prisma.notification.create({ data: { userId, title: "Lancamento financeiro salvo", message: `${transaction.direction === "in" ? "Entrada" : "Saida"} de ${formatMoney(transaction.amount)} registrada.`, type: "success" } });
      await writeSystemLog({ userId, module: "finance", action: "assistant_transaction", message: "Lancamento financeiro criado pelo chat", metadata: { transactionId: transaction.id, status: transaction.status } });
      return { reply: `Lancamento salvo: ${transaction.direction === "in" ? "entrada" : "saida"} de ${formatMoney(transaction.amount)}. Status: ${transaction.status === "confirmed" ? "confirmado" : "pendente de revisao"}.`, intent: "finance.transaction_saved", data: transaction };
    }

    return null;
  },

  async answerReport(userId: string, content: string) {
    const text = normalize(content);
    if (/quais contas|contas tenho|saldo total/.test(text)) {
      const summary = await financeLedgerService.summary(userId);
      if (!summary.accounts.length) return { reply: "Voce ainda nao tem contas financeiras cadastradas.", intent: "finance.report.accounts", data: summary };
      const lines = summary.accounts.map((account) => `- ${account.accountName}: ${formatMoney(account.currentBalance)}`).join("\n");
      return { reply: `Saldo total: ${formatMoney(summary.totalBalance)}\n${lines}`, intent: "finance.report.accounts", data: summary };
    }
    if (/quanto entrou|entradas do mes/.test(text)) {
      const summary = await financeLedgerService.summary(userId);
      return { reply: `Entradas confirmadas deste mes: ${formatMoney(summary.monthIncome)}.`, intent: "finance.report.income", data: summary };
    }
    if (/quanto saiu|saidas do mes|gastei/.test(text)) {
      const summary = await financeLedgerService.summary(userId);
      return { reply: `Saidas confirmadas deste mes: ${formatMoney(summary.monthExpenses)}.`, intent: "finance.report.expense", data: summary };
    }
    if (/sem categoria|revisao/.test(text)) {
      const pending = await prisma.financialTransaction.findMany({ where: { userId, OR: [{ status: "pending_review" }, { categoryId: null }] }, take: 10, orderBy: { date: "desc" } });
      return { reply: pending.length ? `Voce tem ${pending.length} lancamentos para revisar.` : "Nao encontrei lancamentos pendentes de revisao.", intent: "finance.report.pending", data: pending };
    }
    if (/duplicad/.test(text)) {
      const duplicates = await prisma.financialTransaction.findMany({ where: { userId, status: "duplicate" }, take: 10, orderBy: { createdAt: "desc" } });
      return { reply: duplicates.length ? `Encontrei ${duplicates.length} possiveis duplicatas.` : "Nao encontrei lancamentos duplicados marcados.", intent: "finance.report.duplicates", data: duplicates };
    }
    return null;
  }
};
