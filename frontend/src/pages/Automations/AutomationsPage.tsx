import { FormEvent, useEffect, useState } from "react";
import { Play, Plus, Trash2 } from "lucide-react";
import { api } from "../../services/api";
import type { Automation } from "../../types";

export function AutomationsPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [name, setName] = useState("");
  const [actionType, setActionType] = useState("n8n");
  const load = () => api.get("/automations").then((res) => setItems(res.data.automations));
  useEffect(() => { load().catch(() => undefined); }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    await api.post("/automations", { name, actionType, triggerType: "manual", enabled: true, config: {} });
    setName(""); await load();
  }
  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Automações</h2>
      <form onSubmit={create} className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_220px_auto]">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da automação" />
        <select className="input" value={actionType} onChange={(e) => setActionType(e.target.value)}><option value="n8n">n8n</option><option value="whatsapp">WhatsApp</option><option value="home_assistant">Home Assistant</option><option value="internal">Interna</option></select>
        <button className="btn btn-primary"><Plus size={18} /> Criar</button>
      </form>
      <div className="grid gap-3">
        {items.map((item) => <div key={item.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"><div><strong className="text-white">{item.name}</strong><p className="text-sm text-slate-400">{item.actionType} · {item.enabled ? "ativa" : "inativa"}</p></div><div className="flex gap-2"><button className="btn btn-ghost" onClick={() => api.post(`/automations/${item.id}/run`, { confirmed: false }).then(load)}><Play size={16} /> Rodar</button><button className="btn btn-ghost" onClick={() => api.delete(`/automations/${item.id}`).then(load)}><Trash2 size={16} /></button></div></div>)}
      </div>
    </section>
  );
}
