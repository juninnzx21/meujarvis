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
  const [whatsappConnection, setWhatsappConnection] = useState("unknown");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [healthResult, publicHealthResult, whatsappResult] = await Promise.allSettled([
        api.get("/health/full"),
        api.get("/health"),
        api.get("/whatsapp/evolution/status")
      ]);
      if (!active) return;
      if (healthResult.status === "fulfilled") {
        const publicHealth = publicHealthResult.status === "fulfilled" ? publicHealthResult.value.data : {};
        setHealth({
          ...healthResult.value.data,
          app: publicHealth.app ?? healthResult.value.data.app,
          readiness: publicHealth.readiness ?? healthResult.value.data.readiness,
          database: publicHealth.database ?? healthResult.value.data.database,
          timestamp: publicHealth.timestamp ?? healthResult.value.data.timestamp
        });
        setError("");
      } else if (publicHealthResult.status === "fulfilled") {
        setHealth({
          ...publicHealthResult.value.data,
          observability: { queryStatus: "unavailable", logsCount: null, recentFailures: [], http: null }
        });
        setError("O status básico está disponível; os detalhes autenticados e o histórico de falhas não puderam ser carregados.");
      } else setError("Nao foi possivel carregar o status do sistema.");
      if (whatsappResult.status === "fulfilled") setWhatsappConnection(whatsappResult.value.data.connectionState || "unknown");
      else setWhatsappConnection("unknown");
    };
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => { active = false; window.clearInterval(interval); };
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
        <StatusPill status={health.readiness || "loading"} />
      </div>
      {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl p-5"><Clock className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Uptime backend</p><strong className="text-xl text-white">{formatUptime(health.uptimeSeconds)}</strong></div>
        <div className="glass rounded-2xl p-5"><Database className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Banco</p><StatusPill status={health.database} /></div>
        <div className="glass rounded-2xl p-5"><ScrollText className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Logs</p><strong className="text-xl text-white">{health.observability?.logsCount ?? "-"}</strong></div>
        <div className="glass rounded-2xl p-5"><Activity className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Scheduler</p><StatusPill status={health.scheduler ? health.scheduler.enabled ? "configured" : "disabled" : "unknown"} /><p className="mt-2 text-xs text-slate-500">{health.scheduler?.intervalSeconds ?? "-"}s</p></div>
        <div className="glass rounded-2xl p-5"><Activity className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Versao</p><strong className="text-xl text-white">{health.version || "-"}</strong></div>
        <div className="glass rounded-2xl p-5"><Activity className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Pedidos HTTP desde a inicialização</p><strong className="text-xl text-white">{health.observability?.http?.requests ?? "-"}</strong><p className="mt-2 text-xs text-slate-400">4xx: {health.observability?.http?.clientErrors ?? "-"} · 5xx: {health.observability?.http?.serverErrors ?? "-"}</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["OpenAI", integrations.openai?.status],
          ["Gemini", integrations.gemini?.status],
          ["n8n", integrations.n8n?.status],
          ["WhatsApp", whatsappConnection],
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
          {health.observability?.queryStatus === "unavailable" && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100">Banco indisponível; o histórico de falhas não pôde ser verificado.</p>}
          {health.observability?.queryStatus !== "unavailable" && failures.length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Nenhuma falha recente registrada.</p>}
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
