import { useEffect, useMemo, useState } from "react";
import { Clipboard, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";
import { OperationalGuidancePanel } from "./components";

type ProviderSummary = {
  provider: string;
  title: string;
  status: string;
  configured: boolean;
  manualSteps?: string[];
  lastTestAt?: string | null;
  lastError?: string | null;
  routePath?: string;
};

export function IntegrationSetupSummaryPage() {
  const [data, setData] = useState<{ status?: string; counts?: Record<string, number>; providers?: ProviderSummary[] }>({});
  const [message, setMessage] = useState("");
  const providers = data.providers || [];
  const markdown = useMemo(() => providers.map((item) => `| ${item.title} | ${item.status} | ${item.configured ? "sim" : "nao"} | ${(item.manualSteps || [])[0] || "sem pendencia"} |`).join("\n"), [providers]);

  async function load() {
    const res = await api.get("/integrations/setup/summary");
    setData(res.data);
  }

  useEffect(() => { load().catch(() => setMessage("Nao foi possivel carregar o resumo.")); }, []);

  function copyReport() {
    const report = `# Relatorio de configuracao JARVIS\n\n| Provider | Status | Configurado | Pendencia |\n|---|---|---|---|\n${markdown}`;
    navigator.clipboard?.writeText(report);
    setMessage("Relatorio Markdown copiado.");
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-white">Resumo de Configuracao</h2>
          <p className="text-slate-400">Status final de cada integracao e proximo passo recomendado.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={copyReport}><Clipboard size={18} /> Exportar Markdown</button>
          <Link className="btn btn-ghost" to="/integrations/setup-wizard"><FileText size={18} /> Voltar ao wizard</Link>
        </div>
      </div>
      {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      <OperationalGuidancePanel />
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-white">Status geral</p>
          <StatusPill status={data.status} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Provider</th>
                <th className="py-2">Status</th>
                <th className="py-2">Configurado</th>
                <th className="py-2">Ultimo teste</th>
                <th className="py-2">Pendencia</th>
                <th className="py-2">Acao</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((item) => (
                <tr key={item.provider} className="border-t border-white/10 text-slate-300">
                  <td className="py-3 font-semibold text-white">{item.title}</td>
                  <td className="py-3"><StatusPill status={item.status} /></td>
                  <td className="py-3">{item.configured ? "sim" : "nao"}</td>
                  <td className="py-3">{item.lastTestAt || "-"}</td>
                  <td className="py-3">{item.lastError || item.manualSteps?.[0] || "sem pendencia"}</td>
                  <td className="py-3">{item.routePath ? <Link className="text-cyan-200" to={item.routePath}>Abrir</Link> : <span className="text-slate-500">Checklist</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
