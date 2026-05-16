import axios from "axios";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";

const keys = {
  apiUrl: "finance_api_url",
  token: "finance_api_token",
  userEmail: "finance_user_email",
  defaultAccountName: "finance_default_account_name",
  defaultAccountId: "finance_default_account_id"
};

type FinanceConfig = {
  apiUrl: string;
  token: string;
  userEmail: string;
  defaultAccountName: string;
  defaultAccountId: string;
};

export type ParsedFinancialTransaction = {
  type: "income" | "expense";
  status: "received" | "paid";
  description: string;
  amount: number;
  transaction_date: string;
  payment_method?: string;
  notes: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 10) return "********";
  return `${value.slice(0, 5)}...${value.slice(-5)}`;
}

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseAmount(text: string) {
  const match =
    text.match(/r\$\s*(\d{1,3}(?:\.\d{3})*|\d+)(?:[,.](\d{2}))?/i) ??
    text.match(/\b(?:valor|pix|recebi|recebido|paguei|pago|entrada|saida|saída|compra|despesa)\D{0,30}(\d{1,3}(?:\.\d{3})*|\d+)(?:[,.](\d{2}))?/i);
  if (!match) return 0;
  const integer = match[1].replace(/\./g, "");
  const cents = match[2] ?? "00";
  return Number(`${integer}.${cents}`);
}

function parseType(text: string): "income" | "expense" | null {
  if (/(entrada|recebi|recebido|pix recebido|venda|receita|ganhei|deposito|depósito)/i.test(text)) return "income";
  if (/(saida|saída|paguei|pago|pix enviado|compra|despesa|debito|débito|transferi)/i.test(text)) return "expense";
  return null;
}

function parseDate(text: string) {
  const match = text.match(/\b(\d{2})[\/.-](\d{2})(?:[\/.-](\d{2,4}))?\b/);
  if (!match) return new Date().toISOString().slice(0, 10);
  const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : String(new Date().getFullYear());
  return `${year}-${match[2]}-${match[1]}`;
}

function cleanDescription(text: string) {
  return text
    .replace(/r\$\s*\d+[.,\d]*/gi, "")
    .replace(/\b(entrada|saida|saída|recebi|recebido|pix recebido|pix enviado|paguei|pago|compra|despesa|receita)\b/gi, "")
    .replace(/\b\d{2}[\/.-]\d{2}(?:[\/.-]\d{2,4})?\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "Lancamento via JARVIS";
}

function looksFinancial(text: string) {
  return /(pix|comprovante|nota fiscal|nf-e|nfe|boleto|entrada|saida|saída|recebi|paguei|valor|despesa|receita|extrato|resumo financeiro|saldo|saldo do mês|saldo do mes|atualizar saldo|atualiza saldo)/i.test(text);
}

function extractItems(payload: unknown): Array<Record<string, unknown>> {
  const root = payload as any;
  const candidates = [root?.data, root?.accounts, root?.data?.data, root];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

function isInvalidFinancialAccountError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data as any;
  const message = JSON.stringify(data || "").toLowerCase();
  return error.response?.status === 422 && message.includes("financial_account_id");
}

export const financeIntegrationService = {
  async runtimeConfig(userId: string): Promise<FinanceConfig> {
    const rows = await prisma.setting.findMany({ where: { userId, key: { in: Object.values(keys) } } });
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      apiUrl: normalizeApiUrl(asString(settings[keys.apiUrl])),
      token: asString(settings[keys.token]),
      userEmail: asString(settings[keys.userEmail]),
      defaultAccountName: asString(settings[keys.defaultAccountName]) || "PJ DO INTER",
      defaultAccountId: asString(settings[keys.defaultAccountId])
    };
  },
  isConfigured(config: FinanceConfig) {
    return Boolean(config.apiUrl && config.token);
  },
  async status(userId: string) {
    const config = await this.runtimeConfig(userId);
    return {
      configured: this.isConfigured(config),
      status: this.isConfigured(config) ? "configured" : "not_configured",
      apiUrl: config.apiUrl,
      apiUrlConfigured: Boolean(config.apiUrl),
      tokenConfigured: Boolean(config.token),
      tokenMasked: maskSecret(config.token),
      userEmail: config.userEmail,
      defaultAccountName: config.defaultAccountName,
      defaultAccountIdConfigured: Boolean(config.defaultAccountId)
    };
  },
  async saveConfig(userId: string, input: { apiUrl: string; token?: string; userEmail?: string; defaultAccountName?: string; defaultAccountId?: string }) {
    const current = await this.runtimeConfig(userId);
    const token = input.token?.trim() ? input.token.trim() : current.token;
    const userEmail = input.userEmail?.trim() || current.userEmail;
    const defaultAccountName = input.defaultAccountName?.trim() || current.defaultAccountName || "PJ DO INTER";
    const defaultAccountId = input.defaultAccountId?.trim() || current.defaultAccountId;
    const entries: Array<[string, Prisma.InputJsonValue]> = [
      [keys.apiUrl, normalizeApiUrl(input.apiUrl)],
      [keys.token, token],
      [keys.userEmail, userEmail],
      [keys.defaultAccountName, defaultAccountName],
      [keys.defaultAccountId, defaultAccountId]
    ];
    await Promise.all(entries.map(([key, value]) => prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value }
    })));
    await writeSystemLog({
      userId,
      module: "finance",
      action: "config_save",
      message: "Configuracao do controle financeiro atualizada",
      metadata: { apiUrlConfigured: Boolean(input.apiUrl), tokenConfigured: Boolean(token), defaultAccountName }
    });
    return this.status(userId);
  },
  async authenticate(userId: string, input: { apiUrl: string; email: string; password: string; defaultAccountName?: string }) {
    const apiUrl = normalizeApiUrl(input.apiUrl);
    const response = await axios.request({
      method: "post",
      url: `${apiUrl}/api/v1/auth/login`,
      data: { email: input.email, password: input.password },
      headers: { Accept: "application/json" },
      timeout: 20000
    });
    const data = response.data?.data ?? response.data;
    const token = data?.token ?? data?.access_token;
    const email = data?.user?.email ?? input.email;
    if (!token) {
      await writeSystemLog({ userId, level: "warning", module: "finance", action: "auth_failed", message: "Controle financeiro nao retornou token" });
      return { status: "error", message: "Controle financeiro nao retornou token." };
    }
    await this.saveConfig(userId, {
      apiUrl,
      token: String(token),
      userEmail: String(email),
      defaultAccountName: input.defaultAccountName || "PJ DO INTER",
      defaultAccountId: ""
    });
    const accountId = await this.resolveDefaultAccountId(userId);
    await writeSystemLog({ userId, module: "finance", action: "auth_login", message: "Controle financeiro vinculado ao JARVIS", metadata: { email, defaultAccountApplied: Boolean(accountId) } });
    return { ...(await this.status(userId)), message: "Controle financeiro vinculado com sucesso." };
  },
  async disconnect(userId: string) {
    await prisma.setting.deleteMany({ where: { userId, key: { in: [keys.token, keys.userEmail, keys.defaultAccountId] } } });
    await writeSystemLog({ userId, module: "finance", action: "auth_disconnect", message: "Controle financeiro desvinculado do JARVIS" });
    return this.status(userId);
  },
  async clearConfig(userId: string) {
    await prisma.setting.deleteMany({ where: { userId, key: { in: Object.values(keys) } } });
    await writeSystemLog({ userId, module: "finance", action: "config_clear", message: "Configuracao do controle financeiro removida" });
    return this.status(userId);
  },
  async request(userId: string, method: "get" | "post", path: string, data?: unknown) {
    const config = await this.runtimeConfig(userId);
    if (!this.isConfigured(config)) return { status: "not_configured", message: "Controle financeiro nao configurado." };
    const response = await axios.request({
      method,
      url: `${config.apiUrl}${path}`,
      data,
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      timeout: 20000
    });
    return { status: "success", data: response.data };
  },
  async testConnection(userId: string) {
    try {
      return await this.request(userId, "get", "/api/v1/me");
    } catch (error) {
      const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = statusCode === 401 || statusCode === 403 ? "Token do controle financeiro recusado." : "Nao foi possivel conectar ao controle financeiro.";
      await writeSystemLog({ userId, level: "warning", module: "finance", action: "test_connection_failed", message, metadata: { statusCode } });
      return { status: "error", message };
    }
  },
  async listAccounts(userId: string) {
    return this.request(userId, "get", "/api/v1/accounts");
  },
  async resolveDefaultAccountId(userId: string, input?: Record<string, unknown>) {
    if (typeof input?.financial_account_id === "string" && input.financial_account_id.trim()) return input.financial_account_id.trim();
    const config = await this.runtimeConfig(userId);
    if (!config.defaultAccountName || !this.isConfigured(config)) return undefined;
    try {
      const accounts = await this.listAccounts(userId);
      if (accounts.status !== "success") return undefined;
      const target = normalizeSearch(config.defaultAccountName);
      const items = extractItems(accounts.data);
      if (config.defaultAccountId && items.some((account) => String(account.id ?? "") === config.defaultAccountId)) return config.defaultAccountId;
      if (config.defaultAccountId) {
        await prisma.setting.deleteMany({ where: { userId, key: keys.defaultAccountId } });
        await writeSystemLog({
          userId,
          level: "warning",
          module: "finance",
          action: "default_account_invalid",
          message: "Conta padrao financeira salva ficou invalida e foi limpa",
          metadata: { defaultAccountName: config.defaultAccountName }
        });
      }
      const found = items.find((account) => {
        const name = normalizeSearch(String(account.name ?? account.title ?? account.description ?? ""));
        return name === target || name.includes(target) || target.includes(name);
      });
      if (!found?.id) {
        await writeSystemLog({
          userId,
          level: "warning",
          module: "finance",
          action: "default_account_not_found",
          message: "Conta padrao financeira nao encontrada",
          metadata: { defaultAccountName: config.defaultAccountName }
        });
        return undefined;
      }
      const accountId = String(found.id);
      await prisma.setting.upsert({
        where: { userId_key: { userId, key: keys.defaultAccountId } },
        update: { value: accountId },
        create: { userId, key: keys.defaultAccountId, value: accountId }
      });
      return accountId;
    } catch (error) {
      await writeSystemLog({
        userId,
        level: "warning",
        module: "finance",
        action: "default_account_lookup_failed",
        message: "Nao foi possivel resolver a conta padrao financeira",
        metadata: { defaultAccountName: config.defaultAccountName }
      });
      return undefined;
    }
  },
  async monthlySummary(userId: string) {
    return this.request(userId, "get", "/api/v1/summary/month");
  },
  parseFinancialText(text: string): ParsedFinancialTransaction | null {
    const type = parseType(text);
    const amount = parseAmount(text);
    if (!type || !amount) return null;
    return {
      type,
      status: type === "income" ? "received" : "paid",
      description: cleanDescription(text),
      amount,
      transaction_date: parseDate(text),
      payment_method: /pix/i.test(text) ? "pix" : undefined,
      notes: `Lancado pelo JARVIS via WhatsApp. Texto original: ${text}`.slice(0, 1000)
    };
  },
  async createTransaction(userId: string, input: Record<string, unknown>) {
    const accountId = await this.resolveDefaultAccountId(userId, input);
    const payload = {
      type: input.type,
      status: input.status || (input.type === "income" ? "received" : "paid"),
      description: input.description,
      amount: input.amount,
      transaction_date: input.transaction_date || new Date().toISOString().slice(0, 10),
      payment_method: input.payment_method,
      financial_account_id: accountId,
      notes: input.notes
    };
    let result;
    try {
      result = await this.request(userId, "post", "/api/v1/transactions", payload);
    } catch (error) {
      if (!isInvalidFinancialAccountError(error)) throw error;
      await prisma.setting.deleteMany({ where: { userId, key: keys.defaultAccountId } });
      await writeSystemLog({
        userId,
        level: "warning",
        module: "finance",
        action: "transaction_retry_without_account",
        message: "Conta financeira invalida; transacao sera reenviada sem conta vinculada",
        metadata: { type: String(payload.type), amount: Number(payload.amount) }
      });
      result = await this.request(userId, "post", "/api/v1/transactions", { ...payload, financial_account_id: undefined });
    }
    if (result.status === "success") {
      await writeSystemLog({
        userId,
        module: "finance",
        action: "transaction_create",
        message: "Transacao enviada ao controle financeiro",
        metadata: { type: String(payload.type), amount: Number(payload.amount), defaultAccountApplied: Boolean(accountId) }
      });
    }
    return result;
  },
  async handleWhatsAppText(userId: string, text: string) {
    if (/resumo|extrato|saldo|atualizar saldo|atualiza saldo|financeiro do mes|financeiro do mês/i.test(text)) {
      const summary = await this.monthlySummary(userId);
      if (summary.status !== "success") return "Controle financeiro ainda nao esta configurado ou nao respondeu.";
      const data = (summary.data as any)?.data ?? summary.data;
      return `Resumo financeiro do mes: entradas R$ ${data.income ?? 0}, saidas R$ ${data.expense ?? 0}, despesas pagas R$ ${data.paid_expense ?? 0}, pendentes R$ ${data.pending_expense ?? 0}.`;
    }
    if (!looksFinancial(text)) return null;
    const parsed = this.parseFinancialText(text);
    if (!parsed) return "Entendi que isso parece financeiro, mas preciso que voce informe se e entrada ou saida e o valor. Exemplo: \"entrada pix recebido R$ 120,00 cliente Joao\".";
    const result = await this.createTransaction(userId, parsed);
    if (result.status !== "success") return "Entendi o lancamento financeiro, mas o controle financeiro nao esta configurado ou recusou a operacao.";
    const config = await this.runtimeConfig(userId);
    const accountLabel = (result.data as any)?.data?.financial_account_id ? config.defaultAccountName : `${config.defaultAccountName} nao encontrada; lancado sem conta vinculada`;
    return `${parsed.type === "income" ? "Entrada" : "Saida"} registrada no controle financeiro: ${parsed.description}, R$ ${parsed.amount.toFixed(2)}. Conta: ${accountLabel}.`;
  }
};
