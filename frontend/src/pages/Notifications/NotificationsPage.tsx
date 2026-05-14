import { useEffect, useState } from "react";
import { Check, CheckCheck, Filter } from "lucide-react";
import { api } from "../../services/api";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  async function load() {
    const query = filter === "all" ? "" : `?${filter}`;
    const res = await api.get(`/notifications${query}`);
    setNotifications(res.data.notifications);
    setUnreadCount(res.data.unreadCount ?? 0);
  }
  useEffect(() => { load(); }, [filter]);
  async function readAll() {
    await api.patch("/notifications/read-all");
    await load();
  }
  async function readOne(id: string) {
    await api.patch(`/notifications/${id}/read`);
    await load();
  }
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-white">Notificacoes</h2>
          <p className="text-sm text-slate-400">{unreadCount} nao lida(s)</p>
        </div>
        <button onClick={readAll} className="btn btn-ghost"><CheckCheck size={18} /> Marcar todas</button>
      </div>
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <Filter size={18} className="text-cyan-200" />
        {[
          ["all", "Todas"],
          ["unread=true", "Nao lidas"],
          ["type=warning", "Warning"],
          ["type=error", "Error"],
          ["today=true", "Hoje"]
        ].map(([value, label]) => (
          <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${filter === value ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-300"}`}>{label}</button>
        ))}
      </div>
      <div className="space-y-3">
        {notifications.length === 0 && <p className="glass rounded-2xl p-4 text-slate-400">Nenhuma notificacao.</p>}
        {notifications.map((item) => (
          <div key={item.id} className={`glass rounded-2xl p-4 ${item.readAt ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-white">{item.title}</p>
              {!item.readAt && <button onClick={() => readOne(item.id)} className="btn btn-ghost"><Check size={16} /> Lida</button>}
            </div>
            <p className="text-sm text-slate-300">{item.message}</p>
            <p className="mt-2 text-xs text-slate-500">{item.type} - {new Date(item.createdAt).toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
