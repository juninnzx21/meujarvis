import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type Row = { id: string; date?: string; description: string; amount?: string; direction: string; status: string; balanceAfter?: string; categorySuggestion?: string };
type Summary = { incomeRows: number; expenseRows: number; pendingRows: number; approvedRows: number; incomeTotal: string; expenseTotal: string };
type Statement = {
  id: string;
  fileName: string;
  fileType: string;
  bankNameDetected?: string;
  accountDetected?: string;
  periodStart?: string;
  periodEnd?: string;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  reviewRows: number;
  rows: Row[];
  metadata?: { finalBalance?: number | string; summary?: Summary };
};

const money = (value?: string | number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value?: string) => value ? new Date(value).toLocaleDateString("pt-BR") : "-";

export function FinanceReviewPage() {
  const params = useParams();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [filter, setFilter] = useState("pending");
  const [message, setMessage] = useState("");

  async function load() {
    if (!params.id) return;
    const res = await api.get(`/finance/imports/${params.id}`);
    setStatement(res.data.import);
  }

  useEffect(() => { load().catch((error) => setMessage(friendlyError(error))); }, [params.id]);

  async function approveAll() {
    if (!params.id) return;
    await api.post(`/finance/imports/${params.id}/approve-all`);
    await load();
  }

  async function importApproved() {
    if (!params.id) return;
    try {
      if (!window.confirm("Confirmar importacao das linhas aprovadas? Duplicadas e ignoradas nao serao gravadas.")) return;
      await api.post(`/finance/imports/${params.id}/import-approved`);
      await load();
      setMessage("Linhas aprovadas importadas e saldo atualizado.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  const rows = statement?.rows.filter((row) => filter === "all" || row.status === filter || row.direction === filter) ?? [];
  const summary = statement?.metadata?.summary;

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-3 text-3xl font-black text-white"><FileSearch className="text-cyanx" /> Revisao de extrato</h2>
        <p className="text-slate-400">{statement?.fileName ?? "Abra uma importacao para revisar linhas antes de gravar."}</p>
        {statement && (
          <p className="mt-2 text-sm text-slate-300">
            {statement.bankNameDetected || "Banco em revisao"} | conta {statement.accountDetected || "a confirmar"} | {date(statement.periodStart)} a {date(statement.periodEnd)} | saldo final {money(statement.metadata?.finalBalance)}
          </p>
        )}
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>

      {!params.id && <p className="rounded-2xl bg-white/5 p-5 text-slate-400">Acesse pela tela Importar Extrato apos enviar um arquivo.</p>}

      {statement && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Linhas", statement.totalRows],
              ["Entradas", summary?.incomeRows ?? 0],
              ["Saidas", summary?.expenseRows ?? 0],
              ["Duplicadas", statement.duplicateRows],
              ["Pendentes", statement.reviewRows],
              ["Aprovadas", summary?.approvedRows ?? 0],
              ["Total entradas", money(summary?.incomeTotal)],
              ["Total saidas", money(summary?.expenseTotal)]
            ].map(([label, value]) => (
              <div key={label} className="glass rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <strong className="text-xl text-white">{value}</strong>
              </div>
            ))}
          </div>

          <div className="glass flex flex-wrap gap-3 rounded-2xl p-4">
            {["pending", "approved", "duplicate", "in", "out", "all"].map((item) => <button key={item} className="btn btn-ghost" onClick={() => setFilter(item)}>{item}</button>)}
            <button className="btn btn-primary" onClick={approveAll}><CheckCircle2 size={18} /> Aprovar pendentes</button>
            <button className="btn btn-primary" onClick={importApproved}><ShieldCheck size={18} /> Importar aprovadas</button>
          </div>

          <div className="glass overflow-x-auto rounded-2xl p-4">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-slate-400"><tr><th>Data</th><th>Descricao</th><th>Direcao</th><th>Valor</th><th>Saldo</th><th>Categoria</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/10 text-slate-200">
                    <td className="py-3">{date(row.date)}</td>
                    <td className="py-3">{row.description}</td>
                    <td>{row.direction}</td>
                    <td>{money(row.amount)}</td>
                    <td>{money(row.balanceAfter)}</td>
                    <td>{row.categorySuggestion || "revisar"}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
