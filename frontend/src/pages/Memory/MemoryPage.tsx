import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../services/api";
import type { Memory } from "../../types";

export function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [q, setQ] = useState("");
  const load = () => api.get("/memories", { params: { q } }).then((res) => setMemories(res.data.memories));
  useEffect(() => { load().catch(() => undefined); }, [q]);
  async function create(event: FormEvent) {
    event.preventDefault();
    await api.post("/memories", { title, content, type: "note", tags: [], importance: 3 });
    setTitle(""); setContent(""); await load();
  }
  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Memória do Assistente</h2>
      <form onSubmit={create} className="glass grid gap-3 rounded-2xl p-5">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
        <textarea className="input min-h-24" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo da memória" />
        <button className="btn btn-primary w-fit"><Plus size={18} /> Salvar memória</button>
      </form>
      <input className="input max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar memória..." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {memories.map((memory) => <article key={memory.id} className="glass rounded-2xl p-5"><div className="flex justify-between gap-3"><h3 className="font-bold text-white">{memory.title}</h3><button onClick={() => api.delete(`/memories/${memory.id}`).then(load)}><Trash2 size={16} /></button></div><p className="mt-3 text-sm text-slate-300">{memory.content}</p></article>)}
      </div>
    </section>
  );
}
