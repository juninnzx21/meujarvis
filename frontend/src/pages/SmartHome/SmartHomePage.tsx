import { FormEvent, useEffect, useMemo, useState } from "react";
import { FlaskConical, Home, ShieldAlert } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

const domains = ["light", "switch", "sensor", "climate", "scene"];

export function SmartHomePage() {
  const [status, setStatus] = useState<any>({});
  const [entities, setEntities] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");

  async function load() {
    const [statusRes, entitiesRes] = await Promise.all([api.get("/home-assistant/status"), api.get("/home-assistant/entities")]);
    setStatus(statusRes.data);
    setEntities(entitiesRes.data.entities?.slice?.(0, 48) || []);
    setGrouped(entitiesRes.data.grouped || {});
  }

  useEffect(() => { load().catch((error) => setReply(friendlyError(error))); }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    try {
      const res = await api.post("/home-assistant/conversation", { text });
      setReply(res.data.message || res.data.status);
    } catch (error) {
      setReply(friendlyError(error));
    }
  }

  async function testConnection() {
    try {
      const res = await api.post("/home-assistant/test-connection");
      setReply(res.data.message || (res.data.status === "success" ? "Home Assistant respondeu com sucesso." : res.data.status));
      await load();
    } catch (error) {
      setReply(friendlyError(error));
    }
  }

  const visibleGroups = useMemo(() => {
    if (Object.keys(grouped).length > 0) return grouped;
    return entities.reduce<Record<string, any[]>>((acc, entity) => {
      const domain = String(entity.entity_id || "other").split(".")[0];
      acc[domain] = [...(acc[domain] || []), entity];
      return acc;
    }, {});
  }, [entities, grouped]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-black text-white">Casa Inteligente</h2>
        <StatusPill status={status.status} />
      </div>
      <div className="glass flex items-start gap-3 rounded-2xl p-4 text-sm text-amber-100">
        <ShieldAlert className="mt-0.5 shrink-0" size={18} />
        <p>Fechaduras, alarmes, garagem, portoes e covers exigem confirmacao explicita no backend antes de qualquer acionamento.</p>
      </div>
      <form onSubmit={send} className="glass flex flex-col gap-3 rounded-2xl p-4 md:flex-row">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex: ligar luz da sala" />
        <button className="btn btn-primary"><Home size={18} /> Enviar</button>
        <button type="button" onClick={testConnection} className="btn btn-ghost"><FlaskConical size={18} /> Testar conexao</button>
      </form>
      {reply && <p className="glass rounded-2xl p-4 text-slate-300">{reply}</p>}
      {domains.map((domain) => (
        <div key={domain} className="space-y-3">
          <h3 className="text-lg font-bold text-white">{domain}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(visibleGroups[domain] || []).slice(0, 12).map((entity) => (
              <div className="glass rounded-2xl p-4" key={entity.entity_id}>
                <strong className="text-white">{entity.attributes?.friendly_name || entity.entity_id}</strong>
                <p className="text-sm text-slate-400">{entity.entity_id}</p>
                <p className="mt-2 text-sm text-cyan-100">{entity.state}</p>
              </div>
            ))}
            {(visibleGroups[domain] || []).length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Nenhuma entidade {domain} disponivel.</p>}
          </div>
        </div>
      ))}
    </section>
  );
}
