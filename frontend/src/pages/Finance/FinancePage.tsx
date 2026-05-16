import { FormEvent, useEffect, useState } from "react";
import { FlaskConical, RefreshCcw, Save, ShieldCheck, Trash2, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

type FinanceStatus = {
  status?: string;
  apiUrl?: string;
  tokenMasked?: string;
  defaultAccountName?: string;
  defaultAccountIdConfigured?: boolean;
};

const defaultApiUrl = "https://controlefinanceiro.juninnzxtec.com.br";

export function FinancePage() {
  const [status, setStatus] = useState<FinanceStatus>({});
  const [config, setConfig] = useState({ apiUrl: defaultApiUrl, token: "", defaultAccountName: "PJ DO INTER" });
  const [transaction, setTransaction] = useState({ type: "expense", description: "", amount: "", transaction_date: new Date().toISOString().slice(0, 10), payment_method: "pix" });
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await api.get("/finance/status");
    setStatus(res.data);
    setConfig((current) => ({
      ...current,
      apiUrl: res.data.apiUrl || defaultApiUrl,
      token: "",
      defaultAccountName: res.data.defaultAccountName || "PJ DO INTER"
    }));
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await api.put("/finance/config", config);
      setStatus(res.data);
      setConfig((current) => ({ ...current, token: "" }));
      setMessage("Controle Financeiro configurado com seguranca.");
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  async function clearConfig() {
    const res = await api.delete("/finance/config");
    setStatus(res.data);
    setConfig({ apiUrl: defaultApiUrl, token: "", defaultAccountName: "PJ DO INTER" });
    setMessage("Configuracao financeira removida.");
  }

  async function testConnection() {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/finance/test-connection");
      setMessage(res.data.status === "success" ? "Controle Financeiro respondeu com sucesso." : res.data.message || res.data.status);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.get("/finance/summary/month");
      if (res.data.status !== "success") {
        setMessage(res.data.message || "Resumo indisponivel.");
        return;
      }
      setSummary(res.data.data?.data ?? res.data.data);
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  async function createTransaction(event?: FormEvent, override?: any) {
    event?.preventDefault();
    const payload = override || { ...transaction, amount: Number(transaction.amount) };
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/finance/transactions", payload);
      setMessage(res.data.status === "success" ? "Lancamento enviado para o Controle Financeiro." : res.data.message || res.data.status);
      if (res.data.status === "success") {
        setTransaction((current) => ({ ...current, description: "", amount: "" }));
        setParsed(null);
        await loadSummary();
      }
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  async function parseText() {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/finance/parse", { text });
      setParsed(res.data.parsed);
      if (!res.data.parsed) setMessage("Nao consegui identificar entrada/saida e valor. Informe algo como: entrada pix recebido R$ 120,00 cliente Joao.");
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx"><WalletCards /></div>
            <div>
              <h2 className="text-3xl font-black text-white">Controle Financeiro</h2>
              <p className="text-slate-400">Registre Pix, notas, valores e resumos pelo painel ou WhatsApp.</p>
            </div>
          </div>
          <StatusPill status={status.status} />
        </div>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <form onSubmit={saveConfig} className="glass space-y-4 rounded-2xl p-5">
          <h3 className="text-xl font-black text-white">Configuracao segura</h3>
          <label className="block text-sm font-semibold text-slate-300">
            URL do sistema financeiro
            <input className="input mt-2" value={config.apiUrl} onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-300">
            Token de API do Controle Financeiro
            <input className="input mt-2" type="password" value={config.token} onChange={(e) => setConfig({ ...config, token: e.target.value })} placeholder={status.tokenMasked ? `Atual: ${status.tokenMasked}` : "Cole o token Bearer/Sanctum"} />
            <span className="mt-1 block text-xs text-slate-500">Deixe em branco para manter o token atual. O token nunca aparece no frontend.</span>
          </label>
          <label className="block text-sm font-semibold text-slate-300">
            Conta padrao para WhatsApp
            <input className="input mt-2" value={config.defaultAccountName} onChange={(e) => setConfig({ ...config, defaultAccountName: e.target.value })} placeholder="PJ DO INTER" />
            <span className="mt-1 block text-xs text-slate-500">O JARVIS tenta localizar essa conta no Controle Financeiro e usa nos lancamentos por WhatsApp.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" disabled={loading}><Save size={18} /> Salvar</button>
            <button type="button" onClick={testConnection} className="btn btn-ghost" disabled={loading}><FlaskConical size={18} /> Testar conexao</button>
            <button type="button" onClick={clearConfig} className="btn btn-ghost"><Trash2 size={18} /> Limpar</button>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-sm text-slate-400">
            <ShieldCheck size={18} className="shrink-0 text-cyanx" />
            <p>Conta atual: {status.defaultAccountName || config.defaultAccountName}. O ID da conta sera resolvido quando o token financeiro estiver configurado.</p>
          </div>
        </form>

        <aside className="glass space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">Resumo do mes</h3>
            <button className="btn btn-ghost px-3 py-2" onClick={loadSummary} disabled={loading}><RefreshCcw size={16} /></button>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-100"><TrendingUp className="mb-2" /> Entradas: R$ {summary?.income ?? "0,00"}</div>
            <div className="rounded-xl bg-purple-400/10 p-3 text-purple-100"><TrendingDown className="mb-2" /> Saidas: R$ {summary?.expense ?? "0,00"}</div>
            <div className="rounded-xl bg-white/5 p-3 text-slate-300">Pendentes: R$ {summary?.pending_expense ?? "0,00"}</div>
          </div>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={createTransaction} className="glass space-y-4 rounded-2xl p-5">
          <h3 className="text-xl font-black text-white">Lancamento manual</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={transaction.type} onChange={(e) => setTransaction({ ...transaction, type: e.target.value })}>
              <option value="expense">Saida</option>
              <option value="income">Entrada</option>
            </select>
            <input className="input" type="number" step="0.01" min="0.01" value={transaction.amount} onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })} placeholder="Valor" />
          </div>
          <input className="input" value={transaction.description} onChange={(e) => setTransaction({ ...transaction, description: e.target.value })} placeholder="Descricao" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" type="date" value={transaction.transaction_date} onChange={(e) => setTransaction({ ...transaction, transaction_date: e.target.value })} />
            <select className="input" value={transaction.payment_method} onChange={(e) => setTransaction({ ...transaction, payment_method: e.target.value })}>
              <option value="pix">Pix</option>
              <option value="card">Cartao</option>
              <option value="cash">Dinheiro</option>
              <option value="bank_transfer">Transferencia</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={loading}>Registrar lancamento</button>
        </form>

        <div className="glass space-y-4 rounded-2xl p-5">
          <h3 className="text-xl font-black text-white">Analisar texto, comprovante ou extrato</h3>
          <textarea className="input min-h-36" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex: entrada pix recebido R$ 250,00 cliente Maria / saida pix enviado R$ 89,90 internet" />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-ghost" onClick={parseText} disabled={loading}>Analisar</button>
            {parsed && <button type="button" className="btn btn-primary" onClick={() => createTransaction(undefined, parsed)} disabled={loading}>Registrar analise</button>}
          </div>
          {parsed && (
            <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
              <p>Tipo: {parsed.type === "income" ? "Entrada" : "Saida"}</p>
              <p>Valor: R$ {Number(parsed.amount).toFixed(2)}</p>
              <p>Descricao: {parsed.description}</p>
              <p>Data: {parsed.transaction_date}</p>
            </div>
          )}
          <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">
            <p className="font-semibold text-slate-200">WhatsApp</p>
            <p>Mensagens financeiras usam a conta padrao {status.defaultAccountName || config.defaultAccountName}. Exemplo: "entrada pix recebido R$ 120,00 cliente Joao".</p>
          </div>
        </div>
      </div>
    </section>
  );
}
