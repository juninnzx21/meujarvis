import { useEffect, useState } from "react";
import { Bell, Bot, Brain, CalendarDays, Database, Home, ListTodo, MessageSquare, Mic, Plus, ScrollText, Share2, Smartphone, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { MetricCard } from "../../components/MetricCard";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";
import type { Task } from "../../types";

type DayNotification = { id: string; message: string; createdAt: string; readAt?: string | null };

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DashboardPage() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [counts, setCounts] = useState({ conversations: 0, tasks: 0, memories: 0, logs: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [dayTasks, setDayTasks] = useState<Task[] | null>(null);
  const [dayNotifications, setDayNotifications] = useState<DayNotification[] | null>(null);
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
      setDayTasks(t.data.tasks);
      setCounts({ conversations: c.data.conversations.length, tasks: t.data.tasks.length, memories: m.data.memories.length, logs: l.data.logs.slice(0, 5) });
      setError("");
    }).catch(() => {
      setError("Nao foi possivel carregar todos os indicadores agora.");
    }).finally(() => setLoading(false));
    api.get("/notifications", { params: { unread: true } })
      .then((result) => setDayNotifications(result.data.notifications))
      .catch(() => setDayNotifications(null));
  }, []);

  const today = localDay(new Date());
  const relevantTasks = (dayTasks ?? []).filter((task) => task.status !== "done" && task.status !== "canceled" && task.dueDate && !Number.isNaN(Date.parse(task.dueDate)) && localDay(new Date(task.dueDate)) <= today)
    .sort((a, b) => Date.parse(a.dueDate!) - Date.parse(b.dueDate!));
  const overdue = relevantTasks.filter((task) => localDay(new Date(task.dueDate!)) < today);

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
        <MetricCard title="Status do JARVIS" value={loading ? "verificando" : error ? "nao verificado" : health.database === "ok" ? "API consultada" : "verificar"} icon={Zap} />
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
      <div className="glass rounded-2xl p-5" aria-label="Meu Dia">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-white"><CalendarDays size={20} /> Meu Dia</h3>
            <p className="text-sm text-slate-400">Pendencias e avisos das suas tarefas e notificacoes existentes.</p>
          </div>
          <Link className="btn btn-ghost" to="/tasks">Ver todas as tarefas</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-white"><ListTodo size={18} /> Tarefas com prazo ate hoje</h4>
            {dayTasks === null ? <p className="text-sm text-amber-200">{loading ? "Carregando tarefas..." : "Nao foi possivel consultar tarefas."}</p> :
              relevantTasks.length === 0 ? <p className="text-sm text-slate-400">Nenhuma tarefa pendente com prazo ate hoje.</p> :
              <ul className="space-y-2">{relevantTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-2 rounded-lg bg-white/5 p-2 text-sm text-slate-200">
                  <span>{task.title}</span>
                  <span className={localDay(new Date(task.dueDate!)) < today ? "shrink-0 text-rose-200" : "shrink-0 text-cyan-100"}>
                    {localDay(new Date(task.dueDate!)) < today ? "Atrasada" : "Hoje"}
                  </span>
                </li>
              ))}</ul>}
            {dayTasks !== null && overdue.length > 0 && <p className="mt-3 text-sm text-rose-200">{overdue.length} tarefa(s) atrasada(s).</p>}
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-white"><Bell size={18} /> Avisos nao lidos</h4>
            {dayNotifications === null ? <p className="text-sm text-amber-200">Avisos indisponiveis ou carregando.</p> :
              dayNotifications.length === 0 ? <p className="text-sm text-slate-400">Nenhuma notificacao nao lida.</p> :
              <ul className="space-y-2">{dayNotifications.slice(0, 5).map((notification) => (
                <li key={notification.id} className="rounded-lg bg-white/5 p-2 text-sm text-slate-200">{notification.message}</li>
              ))}</ul>}
            <Link className="mt-3 inline-block text-sm text-cyan-100 underline" to="/notifications">Abrir notificacoes</Link>
          </div>
        </div>
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
