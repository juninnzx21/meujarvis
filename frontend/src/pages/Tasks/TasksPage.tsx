import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../services/api";
import type { Task } from "../../types";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("");

  const load = () => api.get("/tasks", { params: { status: status || undefined } }).then((res) => setTasks(res.data.tasks));
  useEffect(() => { load().catch(() => undefined); }, [status]);

  async function create(event: FormEvent) {
    event.preventDefault();
    await api.post("/tasks", { title, priority });
    setTitle("");
    await load();
  }

  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Tarefas e Lembretes</h2>
      <form onSubmit={create} className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_180px_auto]">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa" />
        <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">baixa</option><option value="medium">média</option><option value="high">alta</option><option value="urgent">urgente</option></select>
        <button className="btn btn-primary"><Plus size={18} /> Criar</button>
      </form>
      <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option><option value="pending">pendente</option><option value="in_progress">em andamento</option><option value="done">concluída</option></select>
      <div className="grid gap-3">
        {tasks.map((task) => (
          <div key={task.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div><strong className="text-white">{task.title}</strong><p className="text-sm text-slate-400">{task.priority} · {task.status}</p></div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => api.patch(`/tasks/${task.id}/status`, { status: "done" }).then(load)}>Concluir</button>
              <button className="btn btn-ghost" onClick={() => api.delete(`/tasks/${task.id}`).then(load)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
