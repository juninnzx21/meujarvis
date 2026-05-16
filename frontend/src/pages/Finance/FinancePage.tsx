import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, FileText, Landmark, ListChecks, PieChart, Plus, ShieldCheck, WalletCards } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type Summary = {
  totalBalance: string;
  monthIncome: string;
  monthExpenses: string;
  estimatedProfit: string;
  pendingReview: number;
  duplicates: number;
  accounts: Array<{ id: string; accountName: string; bankName: string; currentBalance: string }>;
  recent: Array<{ id: string; description: string; amount: string; direction: "in" | "out"; bankAccount?: { accountName: string } }>;
};

function money(value: string | number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/finance/reports/summary")
      .then((res) => setSummary(res.data))
      .catch((error) => setMessage(friendlyError(error)));
  }, []);

  const cards = [
    { label: "Saldo total", value: money(summary?.totalBalance ?? 0), icon: WalletCards, tone: "text-cyanx" },
    { label: "Entradas do mês", value: money(summary?.monthIncome ?? 0), icon: ArrowUpRight, tone: "text-emerald-300" },
    { label: "Saídas do mês", value: money(summary?.monthExpenses ?? 0), icon: ArrowDownRight, tone: "text-purple-300" },
    { label: "Resultado estimado", value: money(summary?.estimatedProfit ?? 0), icon: PieChart, tone: "text-blue-300" }
  ];

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx"><WalletCards /></div>
            <div>
              <h2 className="text-3xl font-black text-white">Financeiro JARVIS</h2>
              <p className="text-slate-400">Contas, lançamentos, importação de extratos e relatórios com revisão segura.</p>
            </div>
          </div>
          <Link to="/finance/transactions" className="btn btn-primary"><Plus size={18} /> Novo lançamento</Link>
        </div>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <Icon className={tone} />
            <p className="mt-4 text-sm text-slate-400">{label}</p>
            <strong className="text-2xl text-white">{value}</strong>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-white">Lançamentos recentes</h3>
            <Link to="/finance/transactions" className="text-sm font-semibold text-cyanx">ver todos</Link>
          </div>
          <div className="space-y-3">
            {summary?.recent?.length ? summary.recent.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                <div>
                  <p className="font-semibold text-white">{item.description}</p>
                  <p className="text-xs text-slate-400">{item.bankAccount?.accountName ?? "Conta"}</p>
                </div>
                <strong className={item.direction === "in" ? "text-emerald-300" : "text-purple-300"}>{item.direction === "in" ? "+" : "-"} {money(item.amount)}</strong>
              </div>
            )) : <p className="rounded-xl bg-white/5 p-4 text-slate-400">Nenhum lançamento financeiro cadastrado ainda.</p>}
          </div>
        </div>

        <aside className="space-y-4">
          <Link to="/finance/accounts" className="glass flex items-center gap-3 rounded-2xl p-4 text-slate-200"><Landmark className="text-cyanx" /> Gerenciar contas</Link>
          <Link to="/finance/categories" className="glass flex items-center gap-3 rounded-2xl p-4 text-slate-200"><ListChecks className="text-cyanx" /> Categorias e regras</Link>
          <Link to="/finance/import" className="glass flex items-center gap-3 rounded-2xl p-4 text-slate-200"><FileText className="text-cyanx" /> Importar extrato</Link>
          <Link to="/finance/reports" className="glass flex items-center gap-3 rounded-2xl p-4 text-slate-200"><PieChart className="text-cyanx" /> Relatórios financeiros</Link>
          <div className="glass rounded-2xl p-4 text-sm text-slate-400">
            <div className="mb-2 flex items-center gap-2 font-semibold text-white"><ShieldCheck size={18} className="text-cyanx" /> Segurança</div>
            Extratos passam por prévia e revisão. Dados bancários completos não são enviados para IA externa por padrão.
          </div>
        </aside>
      </div>
    </section>
  );
}
