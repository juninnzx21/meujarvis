import { FormEvent, useEffect, useState } from "react";
import { FlaskConical, Save, Share2, Trash2, Workflow } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

export function N8nPage() {
  const [status, setStatus] = useState<any>({});
  const [config, setConfig] = useState({ webhookUrl: "", apiKey: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [statusRes, configRes] = await Promise.all([api.get("/n8n/status"), api.get("/n8n/config")]);
    setStatus(statusRes.data);
    setConfig({ webhookUrl: configRes.data.webhookUrl || "", apiKey: "" });
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    if (/^https?:\/\//i.test(config.apiKey.trim())) {
      setResult("O campo API Key recebeu uma URL. Cole a URL no campo Webhook e a chave/token no campo API Key.");
      return;
    }
    try {
      const res = await api.put("/n8n/config", config);
      setStatus(res.data);
      setConfig((current) => ({ ...current, apiKey: "" }));
      setResult("Configuracao n8n salva com seguranca.");
    } catch (error) {
      setResult(friendlyError(error));
    }
  }

  async function clearConfig() {
    const res = await api.delete("/n8n/config");
    setStatus(res.data);
    setConfig({ webhookUrl: "", apiKey: "" });
    setResult("Configuracao n8n removida.");
  }

  async function testWebhook() {
    setLoading(true);
    setResult("");
    try {
      const res = await api.post("/n8n/test");
      setResult(res.data.message || (res.data.status === "success" ? "Webhook n8n testado com sucesso." : res.data.status));
      await load();
    } catch (error) {
      setResult(friendlyError(error) || "Nao foi possivel testar o webhook n8n agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <form onSubmit={saveConfig} className="glass space-y-5 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx"><Share2 /></div>
          <div>
            <h2 className="text-3xl font-black text-white">n8n</h2>
            <p className="text-slate-400">Configure um webhook seguro para o JARVIS acionar fluxos externos.</p>
          </div>
        </div>
        <label className="block text-sm font-semibold text-slate-300">
          URL do webhook n8n
          <input
            className="input mt-2"
            value={config.webhookUrl}
            onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
            placeholder="https://seu-n8n.com/webhook/jarvis"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-300">
          API key ou token opcional
          <input
            className="input mt-2"
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder={status.apiKeyMasked ? `Atual: ${status.apiKeyMasked}` : "Deixe em branco se o webhook nao exigir token"}
          />
          <span className="mt-1 block text-xs text-slate-500">Deixe em branco para manter a chave atual. O JARVIS nunca mostra a chave salva.</span>
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary"><Save size={18} /> Salvar configuracao</button>
          <button type="button" onClick={testWebhook} disabled={loading} className="btn btn-ghost">
            <FlaskConical size={18} /> {loading ? "Testando..." : "Testar webhook n8n"}
          </button>
          <button type="button" onClick={clearConfig} className="btn btn-ghost"><Trash2 size={18} /> Limpar</button>
        </div>
        {result && <p className="rounded-xl bg-white/5 p-3 text-slate-300">{result}</p>}
      </form>
      <aside className="glass space-y-4 rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-white">Status</h3>
        <StatusPill status={status.status} />
        <div className="grid gap-3 text-sm text-slate-400">
          <span>Fonte: {status.source || "settings"}</span>
          <span>Webhook: {status.webhookConfigured ? "configurado" : "ausente"}</span>
          <span>API key: {status.apiKeyConfigured ? status.apiKeyMasked : "ausente"}</span>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-200"><Workflow size={18} /> Passo a passo rapido</div>
          <p>1. No n8n, crie um workflow com um node Webhook.</p>
          <p>2. Copie a Production URL do webhook e cole aqui.</p>
          <p>3. Salve, clique em testar e veja o log no n8n.</p>
          <p>4. Use comandos como "testar n8n" ou automacoes com actionType n8n.</p>
        </div>
        <p className="text-sm text-slate-400">A URL e a chave ficam salvas no backend. Sem webhook configurado, o JARVIS retorna not_configured sem quebrar.</p>
      </aside>
    </section>
  );
}
