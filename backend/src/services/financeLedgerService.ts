import { Prisma, type FinancialDirection, type FinancialTransactionStatus } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";

export const defaultFinancialCategories = [
  { name: "Vendas", type: "income", keywords: ["venda", "vendas", "produto"] },
  { name: "Servicos prestados", type: "income", keywords: ["servico", "site", "freela", "desenvolvimento", "uber do brasil tecnologia"] },
  { name: "Recebimento de cliente", type: "income", keywords: ["cliente", "pix recebido", "recebimento", "credito pix"] },
  { name: "Transferencia recebida", type: "income", keywords: ["transferencia recebida", "ted recebida"] },
  { name: "Estorno recebido", type: "income", keywords: ["estorno"] },
  { name: "Reembolso", type: "income", keywords: ["reembolso"] },
  { name: "Aporte", type: "income", keywords: ["aporte"] },
  { name: "Outros recebimentos", type: "income", keywords: ["rendimento", "credito"] },
  { name: "Fornecedores", type: "expense", keywords: ["fornecedor", "compra"] },
  { name: "Assinaturas e softwares", type: "expense", keywords: ["assinatura", "software", "github", "openai", "google"] },
  { name: "Internet e telefonia", type: "expense", keywords: ["internet", "telefone", "vivo", "claro", "tim"] },
  { name: "Hospedagem e servidores", type: "expense", keywords: ["servidor", "hospedagem", "vps", "aws", "vultr", "host", "fabweb"] },
  { name: "Impostos e taxas", type: "expense", keywords: ["imposto", "das", "taxa"] },
  { name: "Tarifas bancarias", type: "expense", keywords: ["tarifa", "cesta", "manutencao conta"] },
  { name: "Marketing", type: "expense", keywords: ["marketing", "anuncio", "ads"] },
  { name: "Transporte", type: "expense", keywords: ["uber", "99", "combustivel", "transporte", "posto", "petroleo", "gasolina", "alcool"] },
  { name: "Alimentacao", type: "expense", keywords: ["restaurante", "lanche", "lanches", "alimentacao", "mercado", "ifood", "padaria", "acai", "drinks", "supermercado", "apoio mineiro", "comercio de alimentos"] },
  { name: "Equipamentos", type: "expense", keywords: ["notebook", "pc", "equipamento"] },
  { name: "Manutencao", type: "expense", keywords: ["manutencao", "conserto"] },
  { name: "Contabilidade", type: "expense", keywords: ["contador", "contabilidade"] },
  { name: "Transferencia enviada", type: "expense", keywords: ["transferencia enviada", "ted enviada"] },
  { name: "Saque", type: "expense", keywords: ["saque"] },
  { name: "Outros gastos", type: "expense", keywords: ["debito", "pagamento"] },
  { name: "Energia e contas", type: "expense", keywords: ["cemig", "energia", "conta de luz"] },
  { name: "Saude e farmacia", type: "expense", keywords: ["drogaria", "araujo", "farmacia"] },
  { name: "Fatura e cartao", type: "expense", keywords: ["pagamento fatura inter", "fatura", "cartao"] },
  { name: "Investimentos", type: "transfer", keywords: ["aplicacao cdb", "resgate cdb", "investimento"] },
  { name: "Transferencia entre contas", type: "transfer", keywords: ["entre contas", "mesma titularidade"] },
  { name: "Pix entre contas proprias", type: "transfer", keywords: ["pix propria", "conta propria"] },
  { name: "Ajuste de saldo", type: "adjustment", keywords: ["ajuste", "saldo inicial"] }
] as const;

type CategorySeed = (typeof defaultFinancialCategories)[number];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decimal(value: number | string | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

function monthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return { start, end };
}

function startEndOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export type NativeTransactionInput = {
  bankAccountId: string;
  categoryId?: string | null;
  type: "income" | "expense" | "transfer" | "adjustment";
  direction?: "in" | "out";
  amount: number | string;
  date?: string;
  description: string;
  originalDescription?: string;
  origin?: string;
  counterpartyName?: string;
  documentNumber?: string;
  transactionExternalId?: string;
  source?: "manual" | "chat" | "statement_import" | "automation";
  status?: FinancialTransactionStatus;
  notes?: string;
  metadata?: Prisma.InputJsonValue;
};

export const financeLedgerService = {
  normalizeText,

  async ensureDefaultCategories(userId: string) {
    for (const item of defaultFinancialCategories) {
      await this.ensureCategory(userId, item);
    }
  },

  async ensureCategory(userId: string, item: CategorySeed) {
    return prisma.financialCategory.upsert({
      where: { userId_name_type: { userId, name: item.name, type: item.type } },
      update: { keywords: [...item.keywords], isDefault: true },
      create: { userId, name: item.name, type: item.type, keywords: [...item.keywords], isDefault: true }
    });
  },

  async listAccounts(userId: string) {
    return prisma.bankAccount.findMany({ where: { userId }, orderBy: [{ active: "desc" }, { bankName: "asc" }] });
  },

  async findAccount(userId: string, query: string) {
    const needle = normalizeText(query);
    const accounts = await this.listAccounts(userId);
    return accounts.find((account) => {
      const haystack = normalizeText(`${account.bankName} ${account.accountName}`);
      return haystack.includes(needle) || needle.includes(haystack);
    }) ?? null;
  },

  async createAccount(userId: string, input: {
    bankName: string;
    accountName: string;
    accountType?: "personal" | "business" | "savings" | "checking" | "credit" | "other";
    currentBalance?: number | string;
    bankCode?: string;
    agency?: string;
    accountNumber?: string;
  }) {
    const account = await prisma.bankAccount.create({
      data: {
        userId,
        bankName: input.bankName,
        accountName: input.accountName,
        accountType: input.accountType ?? "checking",
        currentBalance: input.currentBalance ?? 0,
        bankCode: input.bankCode,
        agency: input.agency,
        accountNumber: input.accountNumber
      }
    });
    await writeSystemLog({ userId, module: "finance", action: "account_create", message: "Conta financeira criada", metadata: { accountId: account.id, bankName: account.bankName, accountName: account.accountName } });
    return account;
  },

  async listCategories(userId: string) {
    await this.ensureDefaultCategories(userId);
    return prisma.financialCategory.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { name: "asc" }] });
  },

  async createCategory(userId: string, input: { name: string; type: "income" | "expense" | "transfer" | "adjustment"; keywords?: string[]; color?: string; icon?: string }) {
    const category = await prisma.financialCategory.create({ data: { userId, name: input.name, type: input.type, keywords: input.keywords ?? [], color: input.color, icon: input.icon } });
    await writeSystemLog({ userId, module: "finance", action: "category_create", message: "Categoria financeira criada", metadata: { categoryId: category.id, name: category.name } });
    return category;
  },

  async categorize(userId: string, description: string, direction: FinancialDirection) {
    await this.ensureDefaultCategories(userId);
    const text = normalizeText(description);
    const rules = await prisma.financialRule.findMany({
      where: { userId, active: true, OR: [{ direction }, { direction: null }] },
      include: { category: true }
    });
    const rule = rules.find((item) => text.includes(normalizeText(item.matchText)));
    if (rule) return { category: rule.category, confidence: 0.95, reason: "rule" };

    const type = direction === "in" ? "income" : direction === "out" ? "expense" : undefined;
    const categories = await prisma.financialCategory.findMany({ where: { userId, ...(type ? { type } : {}) } });
    let best = null as null | { category: (typeof categories)[number]; score: number };
    for (const category of categories) {
      const score = category.keywords.reduce((total, keyword) => total + (text.includes(normalizeText(keyword)) ? 1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { category, score };
    }
    if (best) return { category: best.category, confidence: Math.min(0.9, 0.55 + best.score * 0.15), reason: "keyword" };
    return { category: null, confidence: 0.2, reason: "review" };
  },

  async detectDuplicate(userId: string, bankAccountId: string, date: Date, amount: Prisma.Decimal, description: string, externalId?: string) {
    if (externalId) {
      const byId = await prisma.financialTransaction.findFirst({ where: { userId, bankAccountId, transactionExternalId: externalId } });
      if (byId) return byId;
    }
    const { start, end } = startEndOfDay(date);
    const normalized = normalizeText(description);
    const candidates = await prisma.financialTransaction.findMany({
      where: { userId, bankAccountId, date: { gte: start, lte: end }, amount }
    });
    return candidates.find((item) => normalizeText(item.originalDescription).includes(normalized) || normalized.includes(normalizeText(item.originalDescription))) ?? null;
  },

  async createTransaction(userId: string, input: NativeTransactionInput) {
    const amount = decimal(input.amount).abs();
    const direction = input.direction ?? (input.type === "income" ? "in" : "out");
    const date = input.date ? new Date(input.date) : new Date();
    const duplicate = await this.detectDuplicate(userId, input.bankAccountId, date, amount, input.originalDescription ?? input.description, input.transactionExternalId);
    const status = duplicate ? "duplicate" : input.status ?? "confirmed";
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.financialTransaction.create({
        data: {
          userId,
          bankAccountId: input.bankAccountId,
          categoryId: input.categoryId || undefined,
          type: input.type,
          direction,
          amount,
          date,
          description: input.description,
          originalDescription: input.originalDescription ?? input.description,
          origin: input.origin ?? "manual",
          counterpartyName: input.counterpartyName,
          documentNumber: input.documentNumber,
          transactionExternalId: input.transactionExternalId,
          source: input.source ?? "manual",
          status,
          notes: input.notes,
          metadata: input.metadata
        }
      });
      if (status === "confirmed") {
        const account = await tx.bankAccount.findUniqueOrThrow({ where: { id: input.bankAccountId } });
        const current = decimal(account.currentBalance);
        const next = direction === "in" ? current.plus(amount) : current.minus(amount);
        await tx.bankAccount.update({ where: { id: input.bankAccountId }, data: { currentBalance: next } });
      }
      return created;
    });
    await writeSystemLog({ userId, module: "finance", action: "transaction_create", message: "Lancamento financeiro criado", metadata: { transactionId: transaction.id, type: transaction.type, direction: transaction.direction, amount: transaction.amount.toString(), status } });
    return transaction;
  },

  async listTransactions(userId: string, query: { status?: FinancialTransactionStatus; bankAccountId?: string; from?: string; to?: string } = {}) {
    return prisma.financialTransaction.findMany({
      where: {
        userId,
        status: query.status,
        bankAccountId: query.bankAccountId,
        date: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {})
        }
      },
      include: { bankAccount: true, category: true },
      orderBy: { date: "desc" },
      take: 200
    });
  },

  async createRule(userId: string, input: { name: string; matchText: string; categoryId: string; direction?: FinancialDirection }) {
    return prisma.financialRule.create({ data: { userId, name: input.name, matchText: input.matchText, categoryId: input.categoryId, direction: input.direction } });
  },

  async summary(userId: string, reference = new Date()) {
    const { start, end } = monthRange(reference);
    const [accounts, income, expenses, pendingReview, duplicates, recent] = await Promise.all([
      prisma.bankAccount.findMany({ where: { userId, active: true }, orderBy: { bankName: "asc" } }),
      prisma.financialTransaction.aggregate({ where: { userId, direction: "in", status: "confirmed", date: { gte: start, lt: end } }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { userId, direction: "out", status: "confirmed", date: { gte: start, lt: end } }, _sum: { amount: true } }),
      prisma.financialTransaction.count({ where: { userId, status: "pending_review" } }),
      prisma.financialTransaction.count({ where: { userId, status: "duplicate" } }),
      prisma.financialTransaction.findMany({ where: { userId }, include: { bankAccount: true, category: true }, orderBy: { date: "desc" }, take: 8 })
    ]);
    const totalBalance = accounts.reduce((total, account) => total.plus(decimal(account.currentBalance)), new Prisma.Decimal(0));
    const incomeValue = decimal(income._sum.amount ?? 0);
    const expenseValue = decimal(expenses._sum.amount ?? 0);
    return { totalBalance, monthIncome: incomeValue, monthExpenses: expenseValue, estimatedProfit: incomeValue.minus(expenseValue), pendingReview, duplicates, accounts, recent };
  },

  async categoriesReport(userId: string, reference = new Date()) {
    const { start, end } = monthRange(reference);
    const transactions = await prisma.financialTransaction.findMany({ where: { userId, status: "confirmed", date: { gte: start, lt: end } }, include: { category: true } });
    const totals = new Map<string, { category: string; type: string; total: Prisma.Decimal }>();
    for (const item of transactions) {
      const key = item.category?.id ?? "uncategorized";
      const current = totals.get(key) ?? { category: item.category?.name ?? "Sem categoria", type: item.type, total: new Prisma.Decimal(0) };
      current.total = current.total.plus(item.amount);
      totals.set(key, current);
    }
    return [...totals.values()].sort((a, b) => Number(b.total.minus(a.total)));
  },

  async cashflow(userId: string, reference = new Date()) {
    const { start, end } = monthRange(reference);
    const transactions = await prisma.financialTransaction.findMany({ where: { userId, status: "confirmed", date: { gte: start, lt: end } }, orderBy: { date: "asc" } });
    const days = new Map<string, { date: string; income: Prisma.Decimal; expense: Prisma.Decimal; net: Prisma.Decimal }>();
    for (const item of transactions) {
      const key = item.date.toISOString().slice(0, 10);
      const current = days.get(key) ?? { date: key, income: new Prisma.Decimal(0), expense: new Prisma.Decimal(0), net: new Prisma.Decimal(0) };
      if (item.direction === "in") current.income = current.income.plus(item.amount);
      if (item.direction === "out") current.expense = current.expense.plus(item.amount);
      current.net = current.income.minus(current.expense);
      days.set(key, current);
    }
    return [...days.values()];
  }
};
