import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock, Database, ScrollText } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";

function formatUptime(seconds?: number) {
  const total = Number(seconds || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

export function StatusPage() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/health/full").then((res) => setHealth(res.data)).catch(() => setError("Nao foi possivel carregar o status do sistema."));
  }, []);

  const integrations = health.integrations || {};
  const failures = health.observability?.recentFailures || [];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-white">Status do Sistema</h2>
          <p className="text-slate-400">Observabilidade local sem expor segredos.</p>
        </div>
        <StatusPill status={health.app || "loading"} />
      </div>
      {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl p-5"><Clock className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Uptime backend</p><strong className="text-xl text-white">{formatUptime(health.uptimeSeconds)}</strong></div>
        <div className="glass rounded-2xl p-5"><Database className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Banco</p><StatusPill status={health.database} /></div>
        <div className="glass rounded-2xl p-5"><ScrollText className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Logs</p><strong className="text-xl text-white">{health.observability?.logsCount ?? 0}</strong></div>
        <div className="glass rounded-2xl p-5"><Activity className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Scheduler</p><StatusPill status={health.scheduler?.enabled ? "configured" : "disabled"} /><p className="mt-2 text-xs text-slate-500">{health.scheduler?.intervalSeconds ?? "-"}s</p></div>
        <div className="glass rounded-2xl p-5"><Activity className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Versao</p><strong className="text-xl text-white">{health.version || "-"}</strong></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["OpenAI", integrations.openai?.status],
          ["Gemini", integrations.gemini?.status],
          ["n8n", integrations.n8n?.status],
          ["WhatsApp", integrations.whatsapp?.status],
          ["Home Assistant", integrations.homeAssistant?.status]
        ].map(([label, status]) => (
          <div key={label} className="glass rounded-2xl p-5">
            <p className="mb-3 font-bold text-white">{label}</p>
            <StatusPill status={status || "unknown"} />
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><AlertTriangle size={18} /> Ultimas falhas</h3>
        <div className="space-y-3">
          {failures.length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Nenhuma falha recente registrada.</p>}
          {failures.map((log: any) => (
            <div key={log.id} className="rounded-xl bg-white/5 p-3 text-sm">
              <p className="font-semibold text-amber-100">{log.level} - {log.module}.{log.action}</p>
              <p className="text-slate-300">{log.message}</p>
              <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
