import { FormEvent, useEffect, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { api, friendlyError } from "../../services/api";

type Account = { id: string; accountName: string };
type ImportItem = { id: string; fileName: string; fileType: string; bankNameDetected?: string; accountDetected?: string; totalRows: number; duplicateRows: number; reviewRows: number; status: string };

export function FinanceImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [imports, setImports] = useState<ImportItem[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [importId, setImportId] = useState("");

  async function loadImports() {
    const res = await api.get("/finance/imports");
    setImports(Array.isArray(res.data.imports) ? res.data.imports : []);
  }

  useEffect(() => {
    api.get("/finance/bank-accounts").then((res) => {
      setAccounts(res.data.accounts);
      setBankAccountId(res.data.accounts[0]?.id ?? "");
    }).catch((error) => setMessage(friendlyError(error)));
    loadImports().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return setMessage("Escolha um arquivo OFX ou CSV.");
    try {
      const content = await file.text();
      const res = await api.post("/finance/imports/upload", {
        fileName: file.name,
        content,
        bankAccountId: bankAccountId || undefined,
        confirmedAccount: true
      });
      setImportId(res.data.import.id);
      setMessage(`Extrato lido com ${res.data.import.totalRows} linhas. Revise antes de importar.`);
      await loadImports();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-3 text-3xl font-black text-white"><FileText className="text-cyanx" /> Importar extrato</h2>
        <p className="text-slate-400">Priorize OFX do Banco Inter PJ. CSV e TXT sao fallback confiavel. PDF fica apenas para conferencia manual.</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>

      <form onSubmit={submit} className="glass max-w-2xl space-y-4 rounded-2xl p-5">
        <select className="input" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
          <option value="">Detectar / escolher depois</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
        </select>
        <input className="input" type="file" accept=".ofx,.csv,.txt,.xlsx,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="btn btn-primary"><Upload size={18} /> Enviar para previa</button>
        {importId && <Link className="btn btn-ghost" to={`/finance/import/${importId}/review`}>Abrir revisao</Link>}
      </form>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-3 text-xl font-bold text-white">Importacoes recentes</h3>
        <div className="grid gap-3">
          {imports.map((item) => (
            <Link key={item.id} to={`/finance/import/${item.id}/review`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyanx/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-white">{item.fileName}</strong>
                <span className="text-xs uppercase text-cyanx">{item.status}</span>
              </div>
              <p className="text-sm text-slate-400">{item.fileType.toUpperCase()} | {item.bankNameDetected || "banco em revisao"} | conta {item.accountDetected || "a confirmar"}</p>
              <p className="text-sm text-slate-300">{item.totalRows} linhas, {item.duplicateRows} duplicadas, {item.reviewRows} pendentes</p>
            </Link>
          ))}
          {!imports.length && <p className="text-slate-400">Nenhum extrato enviado ainda.</p>}
        </div>
      </div>
    </section>
  );
}
