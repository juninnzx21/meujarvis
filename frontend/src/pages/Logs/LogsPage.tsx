import { AlertTriangle, CheckCircle2, Clock, Pause, Play, RefreshCw, Search, Terminal, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, friendlyError } from "../../services/api";
import type { SystemLog, SystemLogSummary } from "../../types";

const levelLabels: Record<string, string> = {
  info: "Info",
  warning: "Avisos",
  error: "Erros",
  security: "Seguranca"
};

const modules = ["", "whatsapp", "n8n", "scheduler", "routines", "integrations", "finance", "documents", "brain", "ai", "auth", "home-assistant"];

function levelClass(level: string) {
  if (level === "error") return "border-red-400/40 bg-red-500/10 text-red-100";
  if (level === "warning") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  if (level === "security") return "border-cyan-400/40 bg-cyan-500/10 text-cyan-100";
  return "border-slate-500/30 bg-white/5 text-slate-200";
}

function formatTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [summary, setSummary] = useState<SystemLogSummary | null>(null);
  const [level, setLevel] = useState("");
  const [module, setModule] = useState("");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [logsRes, summaryRes] = await Promise.all([
        api.get("/logs", { params: { level: level || undefined, module: module || undefined, search: search || undefined, take: 250 } }),
        api.get("/logs/summary", { params: { hours: 12 } })
      ]);
      setLogs(logsRes.data.logs ?? []);
      setSummary(summaryRes.data);
      setLastRefresh(new Date().toLocaleTimeString("pt-BR"));
    } catch (err) {
      setError(friendlyError(err) || "Nao foi possivel carregar os logs.");
    } finally {
      setLoading(false);
    }
  }, [level, module, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  const totals = useMemo(() => summary?.levels ?? {}, [summary]);
  const hasWhatsappProblem = logs.some((log) => log.module === "whatsapp" && /nao configurado|ignorado|desativada/i.test(log.message));

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Observabilidade</p>
          <h2 className="mt-2 flex items-center gap-3 text-3xl font-black text-white"><Terminal className="text-cyanx" /> CMD online do JARVIS</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Veja em tempo quase real o que chegou no backend: webhook do WhatsApp, scheduler, n8n, IA, financeiro e integracoes. Segredos e payloads sensiveis nao aparecem aqui.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => setAutoRefresh((value) => !value)}>
            {autoRefresh ? <Pause size={18} /> : <Play size={18} />} {autoRefresh ? "Pausar ao vivo" : "Ativar ao vivo"}
          </button>
          <button className="btn btn-primary" onClick={load} disabled={loading}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {["error", "warning", "security", "info"].map((item) => (
          <div key={item} className={`rounded-xl border p-4 ${levelClass(item)}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{levelLabels[item]}</p>
            <strong className="mt-2 block text-2xl text-white">{totals[item] ?? 0}</strong>
            <span className="text-xs opacity-80">ultimas 12h</span>
          </div>
        ))}
      </div>

      {hasWhatsappProblem && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 shrink-0" size={20} />
            <div>
              <strong className="text-white">WhatsApp ainda nao esta respondendo porque os logs indicam configuracao ausente, comando ignorado ou resposta automatica desativada.</strong>
              <p className="mt-1 text-amber-100/80">
                Para validar: conecte a Evolution em producao, configure o webhook oficial e envie de outro numero uma mensagem com "ei jarvis".
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[180px_180px_1fr_auto]">
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Todos os niveis</option>
            <option value="info">Info</option>
            <option value="warning">Avisos</option>
            <option value="error">Erros</option>
            <option value="security">Seguranca</option>
          </select>
          <select className="input" value={module} onChange={(e) => setModule(e.target.value)}>
            {modules.map((item) => <option key={item || "all"} value={item}>{item || "Todos os modulos"}</option>)}
          </select>
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por modulo, acao ou mensagem" />
          </label>
          <div className="flex items-center justify-end gap-2 text-sm text-slate-400">
            <Clock size={16} /> {lastRefresh || "aguardando"}
          </div>
        </div>
      </div>

      {summary?.recentIssues?.length ? (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-white"><AlertTriangle size={18} className="text-amber-300" /> Ultimos pontos de atencao</h3>
          <div className="grid gap-2 lg:grid-cols-2">
            {summary.recentIssues.slice(0, 6).map((log) => (
              <div key={log.id} className={`rounded-xl border p-3 text-sm ${levelClass(log.level)}`}>
                <strong>{log.module}.{log.action}</strong>
                <p className="mt-1 text-slate-200">{log.message}</p>
                <span className="mt-2 block text-xs opacity-70">{formatTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="flex items-center gap-2 font-bold text-white"><Terminal size={18} /> Linha do tempo</h3>
          <span className="text-sm text-slate-400">{logs.length} registros</span>
        </div>
        {error && <div className="m-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
        {!error && !loading && logs.length === 0 && (
          <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Nenhum log encontrado com os filtros atuais.
          </div>
        )}
        {loading && logs.length === 0 && <div className="p-4 text-sm text-slate-400">Carregando logs...</div>}
        {logs.map((log) => (
          <div key={log.id} className="grid gap-2 border-b border-white/10 p-4 text-sm md:grid-cols-[120px_190px_1fr_190px]">
            <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${levelClass(log.level)}`}>{levelLabels[log.level] ?? log.level}</span>
            <span className="font-mono text-cyan-100">{log.module}.{log.action}</span>
            <span className="text-slate-200">{log.message}</span>
            <span className="text-slate-500">{formatTime(log.createdAt)}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
          <p>
            Dica rapida: quando voce mandar mensagem no WhatsApp, procure por <strong>whatsapp.webhook_received</strong>. Se nao aparecer, a Evolution nao esta chamando o webhook da API. Se aparecer como <strong>webhook_ignored</strong>, veja o motivo: sem "ei jarvis", fromMe ou grupo.
          </p>
        </div>
      </div>
    </section>
  );
}
