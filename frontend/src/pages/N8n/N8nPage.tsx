import { FormEvent, useEffect, useState } from "react";
import { Boxes, FlaskConical, Save, Share2, Trash2, Workflow } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

export function N8nPage() {
  const [status, setStatus] = useState<any>({});
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [config, setConfig] = useState({ webhookUrl: "", apiKey: "", webhookSecret: "", enabled: true });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [statusRes, configRes, workflowsRes] = await Promise.all([api.get("/n8n/status"), api.get("/n8n/config"), api.get("/n8n/workflows/local")]);
    setStatus(statusRes.data);
    setConfig({ webhookUrl: configRes.data.webhookUrl || "", apiKey: "", webhookSecret: "", enabled: configRes.data.enabled ?? true });
    setWorkflows(workflowsRes.data.workflows || []);
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
      setConfig((current) => ({ ...current, apiKey: "", webhookSecret: "" }));
      setResult("Configuracao n8n salva com seguranca.");
    } catch (error) {
      setResult(friendlyError(error));
    }
  }

  async function clearConfig() {
    const res = await api.delete("/n8n/config");
    setStatus(res.data);
    setConfig({ webhookUrl: "", apiKey: "", webhookSecret: "", enabled: true });
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

  async function testTemplate(template: string) {
    setLoading(true);
    setResult("");
    try {
      const res = await api.post(`/n8n/templates/${encodeURIComponent(template)}/test`);
      setResult(res.data.message || (res.data.status === "success" ? `Template ${template} testado.` : res.data.status));
    } catch (error) {
      setResult(friendlyError(error) || "Nao foi possivel testar o template agora.");
    } finally {
      setLoading(false);
    }
  }

  async function bootstrapWorkflows() {
    const res = await api.post("/n8n/workflows/bootstrap");
    setResult(res.data.message || "Workflows padrao preparados para importacao manual.");
  }

  async function importAllWorkflows() {
    const res = await api.post("/n8n/workflows/import-all");
    setResult(res.data.message || `Importacao: ${res.data.status}`);
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
        <label className="block text-sm font-semibold text-slate-300">
          Webhook secret opcional
          <input
            className="input mt-2"
            type="password"
            value={config.webhookSecret}
            onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
            placeholder={status.webhookSecretConfigured ? "Secret configurado" : "Secret compartilhado opcional"}
          />
          <span className="mt-1 block text-xs text-slate-500">Usado no header X-Jarvis-Webhook-Secret. Nunca e exibido novamente.</span>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
          n8n habilitado
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary"><Save size={18} /> Salvar configuracao</button>
          <button type="button" onClick={testWebhook} disabled={loading} className="btn btn-ghost">
            <FlaskConical size={18} /> {loading ? "Testando..." : "Testar webhook n8n"}
          </button>
          <button type="button" onClick={clearConfig} className="btn btn-ghost"><Trash2 size={18} /> Limpar</button>
          <button type="button" onClick={bootstrapWorkflows} className="btn btn-ghost"><Boxes size={18} /> Workflows padrao</button>
          <button type="button" onClick={importAllWorkflows} className="btn btn-ghost"><Workflow size={18} /> Importar todos</button>
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
          <span>Webhook secret: {status.webhookSecretConfigured ? "configurado" : "ausente"}</span>
          <span>Habilitado: {String(status.enabled ?? true)}</span>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-200"><Boxes size={18} /> Templates seguros</div>
          <div className="flex flex-wrap gap-2">
            {(status.templates || []).slice(0, 8).map((template: string) => (
              <button key={template} type="button" onClick={() => testTemplate(template)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:border-cyan-300/60">
                {template}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-200"><Workflow size={18} /> Workflows locais</div>
          <div className="max-h-44 space-y-2 overflow-auto">
            {workflows.map((workflow) => (
              <button key={workflow.name} type="button" onClick={() => testTemplate(workflow.template)} className="block w-full truncate rounded-lg border border-white/10 px-2 py-1 text-left text-xs text-slate-300 hover:border-cyan-300/60">
                {workflow.name}
              </button>
            ))}
          </div>
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
