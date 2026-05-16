import { FormEvent, useEffect, useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type Account = { id: string; bankName: string; accountName: string; accountType: string; currentBalance: string; active: boolean };
const money = (value: string | number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinanceAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ bankName: "Banco Inter", accountName: "PJ DO INTER", accountType: "business", currentBalance: "0" });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get("/finance/bank-accounts");
    setAccounts(res.data.accounts);
  }

  useEffect(() => { load().catch((error) => setMessage(friendlyError(error))); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await api.post("/finance/bank-accounts", { ...form, currentBalance: Number(form.currentBalance) });
      setForm({ bankName: "", accountName: "", accountType: "checking", currentBalance: "0" });
      await load();
      setMessage("Conta criada com segurança.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-3 text-3xl font-black text-white"><Landmark className="text-cyanx" /> Contas bancárias</h2>
        <p className="text-slate-400">Cadastre contas como Inter PJ, Nubank, Caixa ou carteira para lançar movimentações.</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-5">
          <h3 className="font-bold text-white">Nova conta</h3>
          <input className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Banco" />
          <input className="input" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="Nome da conta" />
          <select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
            <option value="business">PJ</option>
            <option value="personal">Pessoal</option>
            <option value="checking">Corrente</option>
            <option value="savings">Poupança</option>
            <option value="credit">Crédito</option>
            <option value="other">Outra</option>
          </select>
          <input className="input" type="number" step="0.01" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: e.target.value })} placeholder="Saldo inicial" />
          <button className="btn btn-primary"><Plus size={18} /> Criar conta</button>
        </form>
        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map((account) => (
            <div key={account.id} className="glass rounded-2xl p-5">
              <p className="text-sm text-slate-400">{account.bankName}</p>
              <h3 className="text-xl font-black text-white">{account.accountName}</h3>
              <p className="mt-4 text-2xl font-black text-cyanx">{money(account.currentBalance)}</p>
              <p className="text-xs text-slate-500">{account.accountType} · {account.active ? "ativa" : "inativa"}</p>
            </div>
          ))}
          {!accounts.length && <p className="rounded-2xl bg-white/5 p-5 text-slate-400">Nenhuma conta cadastrada.</p>}
        </div>
      </div>
    </section>
  );
}
