import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, FileSearch } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type Row = { id: string; description: string; amount?: string; direction: string; status: string; categorySuggestion?: string };
type Statement = { id: string; fileName: string; totalRows: number; importedRows: number; duplicateRows: number; reviewRows: number; rows: Row[] };
const money = (value?: string) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
      await api.post(`/finance/imports/${params.id}/import-approved`);
      await load();
      setMessage("Linhas aprovadas importadas e saldo atualizado.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  const rows = statement?.rows.filter((row) => filter === "all" || row.status === filter || row.direction === filter) ?? [];

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-3 text-3xl font-black text-white"><FileSearch className="text-cyanx" /> Revisão de extrato</h2>
        <p className="text-slate-400">{statement?.fileName ?? "Abra uma importação para revisar linhas antes de gravar."}</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>
      {!params.id && <p className="rounded-2xl bg-white/5 p-5 text-slate-400">Acesse pela tela Importar Extrato após enviar um arquivo.</p>}
      {statement && (
        <>
          <div className="glass flex flex-wrap gap-3 rounded-2xl p-4">
            {["pending", "duplicate", "in", "out", "all"].map((item) => <button key={item} className="btn btn-ghost" onClick={() => setFilter(item)}>{item}</button>)}
            <button className="btn btn-primary" onClick={approveAll}><CheckCircle2 size={18} /> Aprovar pendentes</button>
            <button className="btn btn-primary" onClick={importApproved}>Importar aprovadas</button>
          </div>
          <div className="glass overflow-x-auto rounded-2xl p-4">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-slate-400"><tr><th>Descrição</th><th>Direção</th><th>Valor</th><th>Categoria</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/10 text-slate-200">
                    <td className="py-3">{row.description}</td>
                    <td>{row.direction}</td>
                    <td>{money(row.amount)}</td>
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
