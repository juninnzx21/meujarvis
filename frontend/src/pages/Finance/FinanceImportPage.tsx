import { FormEvent, useEffect, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { api, friendlyError } from "../../services/api";

type Account = { id: string; accountName: string };

export function FinanceImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [importId, setImportId] = useState("");

  useEffect(() => {
    api.get("/finance/bank-accounts").then((res) => {
      setAccounts(res.data.accounts);
      setBankAccountId(res.data.accounts[0]?.id ?? "");
    }).catch((error) => setMessage(friendlyError(error)));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return setMessage("Escolha um arquivo CSV, OFX ou TXT.");
    try {
      const content = await file.text();
      const res = await api.post("/finance/imports/upload", { fileName: file.name, content, bankAccountId: bankAccountId || undefined });
      setImportId(res.data.import.id);
      setMessage(`Extrato lido com ${res.data.import.totalRows} linhas. Revise antes de importar.`);
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-3 text-3xl font-black text-white"><FileText className="text-cyanx" /> Importar extrato</h2>
        <p className="text-slate-400">Envie CSV, OFX ou TXT. PDF/XLSX só serão aceitos quando puderem ser interpretados com segurança.</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>
      <form onSubmit={submit} className="glass max-w-2xl space-y-4 rounded-2xl p-5">
        <select className="input" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
          <option value="">Detectar / escolher depois</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
        </select>
        <input className="input" type="file" accept=".csv,.ofx,.txt,.xlsx,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="btn btn-primary"><Upload size={18} /> Enviar para prévia</button>
        {importId && <Link className="btn btn-ghost" to={`/finance/import/${importId}/review`}>Abrir revisão</Link>}
      </form>
    </section>
  );
}
