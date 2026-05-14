import { useEffect, useState } from "react";
import { api } from "../../services/api";
import type { SystemLog } from "../../types";

export function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [level, setLevel] = useState("");
  useEffect(() => { api.get("/logs", { params: { level: level || undefined } }).then((res) => setLogs(res.data.logs)); }, [level]);
  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Logs do Sistema</h2>
      <select className="input max-w-xs" value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Todos os níveis</option><option value="info">info</option><option value="warning">warning</option><option value="error">error</option><option value="security">security</option></select>
      <div className="glass overflow-hidden rounded-2xl">
        {logs.map((log) => <div key={log.id} className="grid gap-2 border-b border-white/10 p-4 text-sm md:grid-cols-[120px_160px_1fr_190px]"><strong className="text-cyan-100">{log.level}</strong><span className="text-slate-300">{log.module}.{log.action}</span><span className="text-slate-200">{log.message}</span><span className="text-slate-500">{new Date(log.createdAt).toLocaleString("pt-BR")}</span></div>)}
      </div>
    </section>
  );
}
