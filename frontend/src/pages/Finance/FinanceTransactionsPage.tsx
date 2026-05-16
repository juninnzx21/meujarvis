import { FormEvent, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type Account = { id: string; accountName: string; bankName: string };
type Category = { id: string; name: string; type: string };
type Transaction = { id: string; description: string; amount: string; direction: "in" | "out"; status: string; bankAccount?: Account; category?: Category };
const money = (value: string | number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinanceTransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState({ bankAccountId: "", categoryId: "", type: "income", amount: "", description: "", date: new Date().toISOString().slice(0, 10) });
  const [message, setMessage] = useState("");

  async function load() {
    const [acc, cat, tx] = await Promise.all([api.get("/finance/bank-accounts"), api.get("/finance/categories"), api.get("/finance/ledger/transactions")]);
    setAccounts(acc.data.accounts);
    setCategories(cat.data.categories);
    setTransactions(tx.data.transactions);
    setForm((current) => ({ ...current, bankAccountId: current.bankAccountId || acc.data.accounts[0]?.id || "" }));
  }

  useEffect(() => { load().catch((error) => setMessage(friendlyError(error))); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/finance/transactions", {
        bankAccountId: form.bankAccountId,
        categoryId: form.categoryId || undefined,
        type: form.type,
        direction: form.type === "income" ? "in" : "out",
        amount: Number(form.amount),
        date: form.date,
        description: form.description,
        origin: "manual"
      });
      setForm((current) => ({ ...current, amount: "", description: "" }));
      await load();
      setMessage("Lançamento salvo e saldo atualizado.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="text-3xl font-black text-white">Lançamentos</h2>
        <p className="text-slate-400">Registre entradas e saídas com confirmação e categoria.</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-5">
          <h3 className="font-bold text-white">Novo lançamento</h3>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
          <select className="input" value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
          </select>
          <input className="input" type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Valor" />
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" />
          <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Sem categoria / revisar</option>
            {categories.filter((cat) => cat.type === form.type).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <button className="btn btn-primary"><Plus size={18} /> Salvar</button>
        </form>
        <div className="space-y-3">
          {transactions.map((item) => (
            <div key={item.id} className="glass flex items-center justify-between rounded-2xl p-4">
              <div className="flex items-center gap-3">
                {item.direction === "in" ? <ArrowUpRight className="text-emerald-300" /> : <ArrowDownRight className="text-purple-300" />}
                <div>
                  <p className="font-semibold text-white">{item.description}</p>
                  <p className="text-xs text-slate-400">{item.bankAccount?.accountName} · {item.category?.name ?? "sem categoria"} · {item.status}</p>
                </div>
              </div>
              <strong className={item.direction === "in" ? "text-emerald-300" : "text-purple-300"}>{item.direction === "in" ? "+" : "-"} {money(item.amount)}</strong>
            </div>
          ))}
          {!transactions.length && <p className="rounded-2xl bg-white/5 p-5 text-slate-400">Nenhum lançamento cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}
