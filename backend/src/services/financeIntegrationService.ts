import axios from "axios";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { writeSystemLog } from "./systemLogService.js";

const keys = {
  apiUrl: "finance_api_url",
  token: "finance_api_token"
};

type FinanceConfig = {
  apiUrl: string;
  token: string;
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
    .slice(0, 180) || "Lançamento via JARVIS";
}

function looksFinancial(text: string) {
  return /(pix|comprovante|nota fiscal|nf-e|nfe|boleto|entrada|saida|saída|recebi|paguei|valor|despesa|receita|extrato|resumo financeiro|saldo do mês|saldo do mes)/i.test(text);
}

export const financeIntegrationService = {
  async runtimeConfig(userId: string): Promise<FinanceConfig> {
    const rows = await prisma.setting.findMany({ where: { userId, key: { in: Object.values(keys) } } });
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { apiUrl: normalizeApiUrl(asString(settings[keys.apiUrl])), token: asString(settings[keys.token]) };
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
      tokenMasked: maskSecret(config.token)
    };
  },
  async saveConfig(userId: string, input: { apiUrl: string; token?: string }) {
    const current = await this.runtimeConfig(userId);
    const token = input.token?.trim() ? input.token.trim() : current.token;
    const entries: Array<[string, Prisma.InputJsonValue]> = [
      [keys.apiUrl, normalizeApiUrl(input.apiUrl)],
      [keys.token, token]
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
      message: "Configuração do controle financeiro atualizada",
      metadata: { apiUrlConfigured: Boolean(input.apiUrl), tokenConfigured: Boolean(token) }
    });
    return this.status(userId);
  },
  async clearConfig(userId: string) {
    await prisma.setting.deleteMany({ where: { userId, key: { in: Object.values(keys) } } });
    await writeSystemLog({ userId, module: "finance", action: "config_clear", message: "Configuração do controle financeiro removida" });
    return this.status(userId);
  },
  async request(userId: string, method: "get" | "post", path: string, data?: unknown) {
    const config = await this.runtimeConfig(userId);
    if (!this.isConfigured(config)) return { status: "not_configured", message: "Controle financeiro não configurado." };
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
      const message = statusCode === 401 || statusCode === 403 ? "Token do controle financeiro recusado." : "Não foi possível conectar ao controle financeiro.";
      await writeSystemLog({ userId, level: "warning", module: "finance", action: "test_connection_failed", message, metadata: { statusCode } });
      return { status: "error", message };
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
      notes: `Lançado pelo JARVIS via WhatsApp. Texto original: ${text}`.slice(0, 1000)
    };
  },
  async createTransaction(userId: string, input: Record<string, unknown>) {
    const payload = {
      type: input.type,
      status: input.status || (input.type === "income" ? "received" : "paid"),
      description: input.description,
      amount: input.amount,
      transaction_date: input.transaction_date || new Date().toISOString().slice(0, 10),
      payment_method: input.payment_method,
      notes: input.notes
    };
    const result = await this.request(userId, "post", "/api/v1/transactions", payload);
    if (result.status === "success") {
      await writeSystemLog({
        userId,
        module: "finance",
        action: "transaction_create",
        message: "Transação enviada ao controle financeiro",
        metadata: { type: String(payload.type), amount: Number(payload.amount) }
      });
    }
    return result;
  },
  async handleWhatsAppText(userId: string, text: string) {
    if (/resumo|extrato|saldo do mes|saldo do mês|financeiro do mes|financeiro do mês/i.test(text)) {
      const summary = await this.monthlySummary(userId);
      if (summary.status !== "success") return "Controle financeiro ainda não está configurado ou não respondeu.";
      const data = (summary.data as any)?.data ?? summary.data;
      return `Resumo financeiro do mês: entradas R$ ${data.income ?? 0}, saídas R$ ${data.expense ?? 0}, despesas pagas R$ ${data.paid_expense ?? 0}, pendentes R$ ${data.pending_expense ?? 0}.`;
    }
    if (!looksFinancial(text)) return null;
    const parsed = this.parseFinancialText(text);
    if (!parsed) return "Entendi que isso parece financeiro, mas preciso que você informe se é entrada ou saída e o valor. Exemplo: \"entrada pix recebido R$ 120,00 cliente João\".";
    const result = await this.createTransaction(userId, parsed);
    if (result.status !== "success") return "Entendi o lançamento financeiro, mas o controle financeiro não está configurado ou recusou a operação.";
    return `${parsed.type === "income" ? "Entrada" : "Saída"} registrada no controle financeiro: ${parsed.description}, R$ ${parsed.amount.toFixed(2)}.`;
  }
};
