import { CheckCircle2, Clipboard, EyeOff, ListChecks, XCircle } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";

export function ConnectionStatusBadge({ status }: { status?: string | boolean }) {
  return <StatusPill status={status} />;
}

export function SecretInputMasked({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-300">
      Segredo
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3">
        <EyeOff size={16} className="text-slate-500" />
        <input className="min-h-12 flex-1 bg-transparent text-sm text-white outline-none" type="password" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}

export function ManualActionChecklist({ steps }: { steps?: string[] }) {
  if (!steps?.length) return null;
  return (
    <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
      <p className="mb-2 flex items-center gap-2 font-bold"><ListChecks size={16} /> Acao manual quando necessario</p>
      <ul className="space-y-1">
        {steps.map((step) => <li key={step}>- {step}</li>)}
      </ul>
    </div>
  );
}

export function WebhookCopyBox({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      <div className="mt-2 flex gap-2">
        <input className="input" readOnly value={value} />
        <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(value)}><Clipboard size={16} /> Copiar</button>
      </div>
    </label>
  );
}

export function IntegrationTestResult({ result }: { result?: string }) {
  if (!result) return null;
  return <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{result}</p>;
}

export function SetupProgressSummary({ providers }: { providers: Array<{ status: string }> }) {
  const total = providers.length || 1;
  const ok = providers.filter((item) => item.status === "configured").length;
  const attention = providers.filter((item) => item.status !== "configured").length;
  return (
    <div className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-3">
      <div>
        <p className="text-sm text-slate-400">Progresso</p>
        <p className="text-3xl font-black text-white">{Math.round((ok / total) * 100)}%</p>
      </div>
      <p className="flex items-center gap-2 text-sm text-cyan-100"><CheckCircle2 size={18} /> {ok} configurado(s)</p>
      <p className="flex items-center gap-2 text-sm text-amber-100"><XCircle size={18} /> {attention} com acao pendente</p>
    </div>
  );
}

