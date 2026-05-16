import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

export function IntegrationEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get("/integrations/events");
    setEvents(res.data.events || []);
  }

  useEffect(() => { load().catch(() => setMessage("Nao foi possivel carregar eventos.")); }, []);

  async function retry(id: string) {
    try {
      const res = await api.post(`/integrations/events/${id}/retry`);
      setMessage(res.data.message || `Evento reenviado: ${res.data.status}`);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-black text-white">Eventos de Integracao</h2>
        <p className="text-slate-400">Fila e historico do EventBus para n8n e integrações internas.</p>
      </div>
      {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr><th className="p-3">Tipo</th><th className="p-3">Destino</th><th className="p-3">Status</th><th className="p-3">Tentativas</th><th className="p-3">Erro</th><th className="p-3">Acoes</th></tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-white/5">
                  <td className="p-3 font-semibold text-white">{event.type}</td>
                  <td className="p-3 text-slate-300">{event.target}</td>
                  <td className="p-3"><StatusPill status={event.status} /></td>
                  <td className="p-3 text-slate-300">{event.attempts}</td>
                  <td className="p-3 text-slate-400">{event.lastError || "-"}</td>
                  <td className="p-3"><button className="btn btn-ghost" onClick={() => retry(event.id)}><RefreshCw size={16} /> Reenviar</button></td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={6} className="p-5 text-slate-400">Nenhum evento registrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
