import { useEffect, useState } from "react";
import { Bell, Bot, Brain, CalendarDays, Database, Home, ListTodo, MessageSquare, Mic, Plus, ScrollText, Share2, Smartphone, WalletCards, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { MetricCard } from "../../components/MetricCard";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";
import type { Task } from "../../types";
import { calendarDay, summarizeDayTasks } from "./daySummary";

type DayNotification = { id: string; message: string; createdAt: string; readAt?: string | null };
type DayRoutine = { id: string; name: string; description?: string | null; enabled: boolean; triggerType: string };
type DayFinanceSummary = { totalBalance: string | number; monthIncome: string | number; monthExpenses: string | number };

function money(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
}

export function DashboardPage() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [counts, setCounts] = useState({ conversations: null as number | null, tasks: null as number | null, memories: null as number | null, logs: null as any[] | null });
  const [loading, setLoading] = useState(true);
  const [dayTasks, setDayTasks] = useState<Task[] | null>(null);
  const [dayNotifications, setDayNotifications] = useState<DayNotification[] | null>(null);
  const [dayRoutines, setDayRoutines] = useState<DayRoutine[] | null>(null);
  const [financeSummary, setFinanceSummary] = useState<DayFinanceSummary | null>(null);
  const [error, setError] = useState("");
  const [notificationError, setNotificationError] = useState(false);
  const [routineError, setRoutineError] = useState(false);
  const [financeError, setFinanceError] = useState(false);
  const [taskActionBusy, setTaskActionBusy] = useState<string | null>(null);
  const [taskActionError, setTaskActionError] = useState("");

  useEffect(() => {
    let active = true;
    const endpoints = ["/health/full", "/chat/conversations", "/tasks", "/memories", "/logs", "/notifications", "/finance/reports/summary", "/routines"] as const;
    setLoading(true);
    setError("");
    setNotificationError(false);
    Promise.allSettled(endpoints.map((endpoint) =>
      endpoint === "/notifications" ? api.get(endpoint, { params: { unread: true } }) : api.get(endpoint)
    )).then(([h, c, t, m, l, n, f, r]) => {
      if (!active) return;
      if (h.status === "fulfilled") setHealth(h.value.data);
      else { setHealth({}); setError("Nao foi possivel verificar a API agora."); }
      setCounts({
        conversations: c.status === "fulfilled" && Array.isArray(c.value.data.conversations) ? c.value.data.conversations.length : null,
        tasks: t.status === "fulfilled" && Array.isArray(t.value.data.tasks) ? t.value.data.tasks.length : null,
        memories: m.status === "fulfilled" && Array.isArray(m.value.data.memories) ? m.value.data.memories.length : null,
        logs: l.status === "fulfilled" && Array.isArray(l.value.data.logs) ? l.value.data.logs.slice(0, 5) : null
      });
      setDayTasks(t.status === "fulfilled" && Array.isArray(t.value.data.tasks) ? t.value.data.tasks : null);
      setDayNotifications(n.status === "fulfilled" && Array.isArray(n.value.data.notifications) ? n.value.data.notifications : null);
      setNotificationError(n.status !== "fulfilled");
      const summary = f.status === "fulfilled" ? f.value.data : null;
      const hasFinanceSummary = Boolean(summary && [summary.totalBalance, summary.monthIncome, summary.monthExpenses].every((value) => typeof value === "string" || typeof value === "number"));
      setFinanceSummary(hasFinanceSummary ? summary : null);
      setFinanceError(!hasFinanceSummary);
      const routines = r.status === "fulfilled" && Array.isArray(r.value.data.routines) ? r.value.data.routines : null;
      setDayRoutines(routines);
      setRoutineError(routines === null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const today = calendarDay(new Date());
  const { due: relevantTasks, overdueCount } = summarizeDayTasks(dayTasks ?? [], new Date());
  const isOverdue = (dueDate: string) => {
    const dueDay = calendarDay(dueDate);
    return today !== null && dueDay !== null && dueDay < today;
  };

  async function completeDayTask(taskId: string) {
    if (taskActionBusy) return;
    setTaskActionBusy(taskId);
    setTaskActionError("");
    try {
      const response = await api.patch(`/tasks/${encodeURIComponent(taskId)}/status`, { status: "done" });
      if (!response.data?.task || response.data.task.id !== taskId || response.data.task.status !== "done") {
        throw new Error("A API nao confirmou a conclusao da tarefa.");
      }
      setDayTasks((previous) => previous?.map((task) => task.id === taskId ? { ...task, status: "done" } : task) ?? null);
    } catch {
      setTaskActionError("Nao foi possivel concluir a tarefa. Tente novamente.");
    } finally {
      setTaskActionBusy(null);
    }
  }

  const openAiStatus = health.integrations?.openai?.status ?? (health.openaiConfigured === true ? "configured" : "not_checked");
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
        <MetricCard title="Status do JARVIS" value={loading ? "verificando" : error ? "nao verificado" : health.database === "ok" ? "Banco OK" : "verificar"} icon={Zap} />
        <MetricCard title="Conversas" value={counts.conversations ?? "indisponivel"} icon={MessageSquare} tone="blue" />
        <MetricCard title="Tarefas" value={counts.tasks ?? "indisponivel"} icon={ListTodo} tone="violet" />
        <MetricCard title="Memorias" value={counts.memories ?? "indisponivel"} icon={Brain} />
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
            {taskActionError && <p role="alert" className="mb-2 text-sm text-rose-200">{taskActionError}</p>}
            {dayTasks === null ? <p className="text-sm text-amber-200">{loading ? "Carregando tarefas..." : "Nao foi possivel consultar tarefas."}</p> :
              relevantTasks.length === 0 ? <p className="text-sm text-slate-400">Nenhuma tarefa pendente com prazo ate hoje.</p> :
              <ul className="space-y-2">{relevantTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-2 rounded-lg bg-white/5 p-2 text-sm text-slate-200">
                  <span className="min-w-0 flex-1">{task.title}</span>
                  <span className={isOverdue(task.dueDate!) ? "shrink-0 text-rose-200" : "shrink-0 text-cyan-100"}>
                    {isOverdue(task.dueDate!) ? "Atrasada" : "Hoje"}
                  </span>
                  <button type="button" disabled={taskActionBusy !== null} onClick={() => void completeDayTask(task.id)}
                    aria-label={`Concluir tarefa: ${task.title}`}
                    className="shrink-0 rounded-lg border border-cyan-300/30 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-300/10 disabled:cursor-wait disabled:opacity-50">
                    {taskActionBusy === task.id ? "Salvando..." : "Concluir"}
                  </button>
                </li>
              ))}</ul>}
            {dayTasks !== null && overdueCount > 0 && <p className="mt-3 text-sm text-rose-200">{overdueCount} tarefa(s) atrasada(s).</p>}
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-white"><Bell size={18} /> Avisos nao lidos</h4>
            {dayNotifications === null ? <p className="text-sm text-amber-200">{notificationError ? "Nao foi possivel consultar notificacoes." : "Carregando notificacoes..."}</p> :
              dayNotifications.length === 0 ? <p className="text-sm text-slate-400">Nenhuma notificacao nao lida.</p> :
              <ul className="space-y-2">{dayNotifications.slice(0, 5).map((notification) => (
                <li key={notification.id} className="rounded-lg bg-white/5 p-2 text-sm text-slate-200">{notification.message}</li>
              ))}</ul>}
            <Link className="mt-3 inline-block text-sm text-cyan-100 underline" to="/notifications">Abrir notificacoes</Link>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-white"><WalletCards size={18} /> Resumo financeiro do mês</h4>
            {financeSummary === null ? <p className="text-sm text-amber-200">{financeError ? "Resumo financeiro indisponivel." : "Carregando resumo financeiro..."}</p> :
              <dl className="grid gap-2 text-sm sm:grid-cols-3">
                <div><dt className="text-slate-400">Saldo total</dt><dd className="font-semibold text-white">{money(financeSummary.totalBalance) ?? "Indisponivel"}</dd></div>
                <div><dt className="text-slate-400">Entradas</dt><dd className="font-semibold text-emerald-200">{money(financeSummary.monthIncome) ?? "Indisponivel"}</dd></div>
                <div><dt className="text-slate-400">Saidas</dt><dd className="font-semibold text-purple-200">{money(financeSummary.monthExpenses) ?? "Indisponivel"}</dd></div>
              </dl>}
            <Link className="mt-3 inline-block text-sm text-cyan-100 underline" to="/finance">Abrir financeiro</Link>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-white"><Zap size={18} /> Rotinas</h4>
            {dayRoutines === null ? <p className="text-sm text-amber-200">{routineError ? "Nao foi possivel consultar rotinas." : "Carregando rotinas..."}</p> :
              dayRoutines.length === 0 ? <p className="text-sm text-slate-400">Nenhuma rotina cadastrada.</p> :
              <ul className="space-y-2">{dayRoutines.slice(0, 4).map((routine) => (
                <li key={routine.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2 text-sm text-slate-200">
                  <span className="min-w-0 truncate">{routine.name}</span>
                  <span className={routine.enabled ? "shrink-0 text-emerald-200" : "shrink-0 text-slate-400"}>{routine.enabled ? "Ativa" : "Desativada"}</span>
                </li>
              ))}</ul>}
            <Link className="mt-3 inline-block text-sm text-cyan-100 underline" to="/routines">Abrir rotinas</Link>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        {statuses.map(([label, status, Icon]) => (
          <div key={label} className="glass rounded-2xl p-5">
            <Icon className="mb-4 text-cyanx" />
            <p className="mb-3 font-bold text-white">{label}</p>
            <StatusPill status={status === true ? "configured" : status === false ? "not_configured" : status === "ok" ? "ok" : status == null ? "not_checked" : String(status)} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-2xl p-5 xl:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><ScrollText size={18} /> Ultimos comandos e logs</h3>
          <div className="space-y-3">
            {!loading && counts.logs?.length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Ainda nao ha logs recentes para exibir.</p>}
            {!loading && counts.logs === null && <p className="text-sm text-amber-200">Logs indisponiveis.</p>}
            {(counts.logs ?? []).map((log) => <div key={log.id} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300"><strong className="text-cyan-100">{log.module}</strong> {log.message}</div>)}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 font-bold text-white">Alertas do sistema</h3>
          <p className="text-slate-300">A disponibilidade dos provedores de IA depende das configuracoes da sua conta. Confira o estado real em Integracoes.</p>
          <Link className="mt-3 inline-block text-sm text-cyan-100 underline" to="/integrations">Consultar integracoes</Link>
        </div>
      </div>
    </section>
  );
}
