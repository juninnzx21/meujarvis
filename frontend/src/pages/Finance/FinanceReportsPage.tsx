import { useEffect, useState } from "react";
import { BarChart3, PieChart } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type Summary = { totalBalance: string; monthIncome: string; monthExpenses: string; estimatedProfit: string; pendingReview: number; duplicates: number };
type CategoryTotal = { category: string; type: string; total: string };
type Cashflow = { date: string; income: string; expense: string; net: string };
const money = (value: string | number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinanceReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [cashflow, setCashflow] = useState<Cashflow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([api.get("/finance/reports/summary"), api.get("/finance/reports/categories"), api.get("/finance/reports/cashflow")])
      .then(([sum, cat, cash]) => {
        setSummary(sum.data);
        setCategories(cat.data.categories);
        setCashflow(cash.data.cashflow);
      })
      .catch((error) => setMessage(friendlyError(error)));
  }, []);

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-3 text-3xl font-black text-white"><BarChart3 className="text-cyanx" /> Relatórios financeiros</h2>
        <p className="text-slate-400">Resumo mensal, categorias, fluxo de caixa e pendências de revisão.</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl p-5"><p className="text-slate-400">Saldo</p><strong className="text-2xl text-white">{money(summary?.totalBalance ?? 0)}</strong></div>
        <div className="glass rounded-2xl p-5"><p className="text-slate-400">Entradas</p><strong className="text-2xl text-emerald-300">{money(summary?.monthIncome ?? 0)}</strong></div>
        <div className="glass rounded-2xl p-5"><p className="text-slate-400">Saídas</p><strong className="text-2xl text-purple-300">{money(summary?.monthExpenses ?? 0)}</strong></div>
        <div className="glass rounded-2xl p-5"><p className="text-slate-400">Revisar</p><strong className="text-2xl text-cyanx">{summary?.pendingReview ?? 0}</strong></div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 flex items-center gap-2 font-black text-white"><PieChart className="text-cyanx" /> Categorias</h3>
          {categories.map((item) => <div key={item.category} className="flex justify-between border-t border-white/10 py-3 text-slate-300"><span>{item.category}</span><strong>{money(item.total)}</strong></div>)}
          {!categories.length && <p className="text-slate-400">Sem dados por categoria.</p>}
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-black text-white">Fluxo de caixa</h3>
          {cashflow.map((item) => <div key={item.date} className="grid grid-cols-4 border-t border-white/10 py-3 text-sm text-slate-300"><span>{item.date}</span><span>{money(item.income)}</span><span>{money(item.expense)}</span><strong>{money(item.net)}</strong></div>)}
          {!cashflow.length && <p className="text-slate-400">Sem fluxo de caixa no período.</p>}
        </div>
      </div>
    </section>
  );
}
