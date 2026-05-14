import { useEffect, useState } from "react";
import { FlaskConical, Share2 } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";

export function N8nPage() {
  const [status, setStatus] = useState<any>({});
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await api.get("/n8n/status");
    setStatus(res.data);
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function testWebhook() {
    setLoading(true);
    setResult("");
    try {
      const res = await api.post("/n8n/test");
      setResult(res.data.message || (res.data.status === "success" ? "Webhook n8n testado com sucesso." : res.data.status));
      await load();
    } catch {
      setResult("Nao foi possivel testar o webhook n8n agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="glass space-y-5 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx"><Share2 /></div>
          <div>
            <h2 className="text-3xl font-black text-white">n8n</h2>
            <p className="text-slate-400">Teste seguro do webhook configurado no backend.</p>
          </div>
        </div>
        <button onClick={testWebhook} disabled={loading} className="btn btn-primary">
          <FlaskConical size={18} /> {loading ? "Testando..." : "Testar webhook n8n"}
        </button>
        {result && <p className="rounded-xl bg-white/5 p-3 text-slate-300">{result}</p>}
      </div>
      <aside className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-white">Status</h3>
        <StatusPill status={status.status} />
        <p className="mt-4 text-sm text-slate-400">A URL e a chave do n8n nunca sao enviadas para o frontend. Sem N8N_WEBHOOK_URL, o status permanece not_configured.</p>
      </aside>
    </section>
  );
}
