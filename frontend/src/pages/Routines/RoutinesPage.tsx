import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";

export function RoutinesPage() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  async function load() {
    const res = await api.get("/routines");
    setRoutines(res.data.routines);
  }
  useEffect(() => { load(); }, []);
  async function run(routine: any) {
    const res = await api.post(`/routines/${routine.id}/run`, { source: "panel" });
    setMessage(`Rotina executada: ${routine.name}`);
    const history = await api.get(`/routines/${routine.id}/runs`);
    setRuns(history.data.runs);
  }
  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Rotinas</h2>
      {message && <p className="rounded-xl bg-cyan-400/10 p-3 text-cyan-100">{message}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {routines.map((routine) => (
          <div key={routine.id} className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between"><strong className="text-white">{routine.name}</strong><StatusPill status={routine.enabled ? "configured" : "disabled"} /></div>
            <p className="min-h-12 text-sm text-slate-400">{routine.description}</p>
            {routine.triggerType === "schedule" && (
              <p className="mt-3 rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                Agenda: {routine.config?.schedule?.type ?? routine.config?.schedule ?? "configurada"} {routine.lastRunAt ? `- ultima ${new Date(routine.lastRunAt).toLocaleString("pt-BR")}` : "- aguardando primeira execucao"}
              </p>
            )}
            <button onClick={() => run(routine)} className="btn btn-primary mt-4" disabled={!routine.enabled}><Play size={18} /> Rodar</button>
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 font-bold text-white">Execucoes recentes</h3>
        {runs.length === 0 && <p className="text-sm text-slate-400">Nenhuma execucao selecionada.</p>}
        {runs.map((run) => <p key={run.id} className="border-b border-white/10 py-2 text-sm text-slate-300">{run.status} - {new Date(run.createdAt).toLocaleString("pt-BR")}</p>)}
      </div>
    </section>
  );
}
