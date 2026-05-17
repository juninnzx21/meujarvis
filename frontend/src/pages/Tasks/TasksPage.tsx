import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, friendlyError } from "../../services/api";
import type { Task } from "../../types";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  const load = () => api.get("/tasks", { params: { status: status || undefined } }).then((res) => setTasks(res.data.tasks));
  useEffect(() => { load().catch((error) => setMessage(friendlyError(error))); }, [status]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setMessage("Informe o titulo da tarefa.");
      return;
    }
    try {
      await api.post("/tasks", { title: title.trim(), priority });
      setTitle("");
      setMessage("Tarefa criada.");
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function complete(taskId: string) {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: "done" });
      setMessage("Tarefa concluida.");
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function remove(taskId: string) {
    try {
      await api.delete(`/tasks/${taskId}`);
      setMessage("Tarefa removida.");
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Tarefas e Lembretes</h2>
      {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      <form onSubmit={create} className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_180px_auto]">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa" />
        <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">baixa</option>
          <option value="medium">media</option>
          <option value="high">alta</option>
          <option value="urgent">urgente</option>
        </select>
        <button className="btn btn-primary"><Plus size={18} /> Criar</button>
      </form>
      <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Todos os status</option>
        <option value="pending">pendente</option>
        <option value="in_progress">em andamento</option>
        <option value="done">concluida</option>
      </select>
      <div className="grid gap-3">
        {tasks.map((task) => (
          <div key={task.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div><strong className="text-white">{task.title}</strong><p className="text-sm text-slate-400">{task.priority} - {task.status}</p></div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => complete(task.id)}>Concluir</button>
              <button className="btn btn-ghost" onClick={() => remove(task.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {!tasks.length && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Nenhuma tarefa encontrada para este filtro.</p>}
      </div>
    </section>
  );
}
