import { useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { api } from "../../services/api";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  async function load() {
    const res = await api.get("/notifications");
    setNotifications(res.data.notifications);
  }
  useEffect(() => { load(); }, []);
  async function readAll() {
    await api.patch("/notifications/read-all");
    await load();
  }
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-3xl font-black text-white">Notificacoes</h2>
        <button onClick={readAll} className="btn btn-ghost"><CheckCheck size={18} /> Marcar todas</button>
      </div>
      <div className="space-y-3">
        {notifications.length === 0 && <p className="glass rounded-2xl p-4 text-slate-400">Nenhuma notificacao.</p>}
        {notifications.map((item) => (
          <div key={item.id} className={`glass rounded-2xl p-4 ${item.readAt ? "opacity-60" : ""}`}>
            <p className="font-bold text-white">{item.title}</p>
            <p className="text-sm text-slate-300">{item.message}</p>
            <p className="mt-2 text-xs text-slate-500">{item.type} - {new Date(item.createdAt).toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
