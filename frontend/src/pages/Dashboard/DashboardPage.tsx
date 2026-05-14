import { useEffect, useState } from "react";
import { Bot, Brain, Database, Home, ListTodo, MessageSquare, Mic, Plus, ScrollText, Share2, Smartphone, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { MetricCard } from "../../components/MetricCard";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";

export function DashboardPage() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [counts, setCounts] = useState({ conversations: 0, tasks: 0, memories: 0, logs: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/health/full"),
      api.get("/chat/conversations"),
      api.get("/tasks"),
      api.get("/memories"),
      api.get("/logs")
    ]).then(([h, c, t, m, l]) => {
      setHealth(h.data);
      setCounts({ conversations: c.data.conversations.length, tasks: t.data.tasks.length, memories: m.data.memories.length, logs: l.data.logs.slice(0, 5) });
      setError("");
    }).catch(() => {
      setError("Nao foi possivel carregar todos os indicadores agora.");
    }).finally(() => setLoading(false));
  }, []);

  const openAiStatus = health.integrations?.openai?.status || (health.openaiConfigured ? "configured" : "missing_key");
  const statuses = [
    ["IA", openAiStatus, Bot],
    ["Banco", health.database, Database],
    ["Home Assistant", health.homeAssistantConfigured, Home],
    ["n8n", health.n8nConfigured, Share2],
    ["WhatsApp", health.whatsappConfigured, Smartphone]
  ] as const;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-white">Painel de Controle</h2>
        <p className="text-slate-400">Visao operacional do JARVIS Home AI.</p>
      </div>
      {loading && <div className="glass rounded-2xl p-4 text-sm text-cyan-100">Carregando telemetria operacional...</div>}
      {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Status do JARVIS" value="online" icon={Zap} />
        <MetricCard title="Conversas" value={counts.conversations} icon={MessageSquare} tone="blue" />
        <MetricCard title="Tarefas" value={counts.tasks} icon={ListTodo} tone="violet" />
        <MetricCard title="Memorias" value={counts.memories} icon={Brain} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Link className="btn btn-ghost" to="/voice"><Mic size={18} /> Falar com JARVIS</Link>
        <Link className="btn btn-ghost" to="/tasks"><Plus size={18} /> Nova tarefa</Link>
        <Link className="btn btn-ghost" to="/memory"><Brain size={18} /> Nova memoria</Link>
        <Link className="btn btn-ghost" to="/n8n"><Share2 size={18} /> Testar integracoes</Link>
        <Link className="btn btn-ghost" to="/logs"><ScrollText size={18} /> Abrir logs</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        {statuses.map(([label, status, Icon]) => (
          <div key={label} className="glass rounded-2xl p-5">
            <Icon className="mb-4 text-cyanx" />
            <p className="mb-3 font-bold text-white">{label}</p>
            <StatusPill status={status === true ? "configured" : status === "ok" ? "ok" : String(status)} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-2xl p-5 xl:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><ScrollText size={18} /> Ultimos comandos e logs</h3>
          <div className="space-y-3">
            {!loading && counts.logs.length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Ainda nao ha logs recentes para exibir.</p>}
            {counts.logs.map((log) => <div key={log.id} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300"><strong className="text-cyan-100">{log.module}</strong> {log.message}</div>)}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 font-bold text-white">Alertas do sistema</h3>
          <p className="text-slate-300">IA usa OpenAI primeiro, Gemini como fallback e modo local seguro se provedores externos falharem.</p>
        </div>
      </div>
    </section>
  );
}
