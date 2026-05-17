import { useEffect, useState } from "react";
import { Activity, Clipboard, ExternalLink, FileText, FlaskConical, RefreshCw, Settings, ShieldCheck, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

const providerLabels: Record<string, string> = {
  api_public: "API publica",
  openai: "OpenAI",
  gemini: "Gemini",
  n8n: "n8n",
  whatsapp: "WhatsApp/Evolution",
  evolution: "Evolution API",
  home_assistant: "Home Assistant",
  finance: "Financeiro",
  monitoring: "Monitoramento",
  backup: "Backup"
};

function providerStatus(provider: any) {
  return provider?.status || (provider?.configured ? "configured" : "not_configured");
}

export function IntegrationsPage() {
  const [data, setData] = useState<any>({});
  const [message, setMessage] = useState("");
  const providers = data.providers || {};
  const urls = data.urls || {};

  async function load() {
    const res = await api.get("/integrations/status");
    setData(res.data);
  }

  useEffect(() => { load().catch(() => setMessage("Nao foi possivel carregar as integracoes.")); }, []);

  async function test(provider: string) {
    setMessage("");
    try {
      const res = await api.post(`/integrations/test/${provider}`);
      setMessage(res.data.message || `Teste ${provider}: ${res.data.status || "ok"}`);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function bootstrap(provider: string) {
    try {
      const res = await api.post(`/integrations/bootstrap/${provider}`);
      setMessage(res.data.message || `Bootstrap ${provider}: ${res.data.status}`);
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-white">Central de Integracoes</h2>
          <p className="text-slate-400">Configure, teste e acompanhe conexoes sem expor segredos no painel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/settings/integrations" className="btn btn-primary"><Settings size={18} /> Configurar</Link>
          <Link to="/integrations/setup-wizard" className="btn btn-ghost"><Workflow size={18} /> Wizard</Link>
          <Link to="/integrations/setup-summary" className="btn btn-ghost"><ShieldCheck size={18} /> Resumo</Link>
          <Link to="/integrations/events" className="btn btn-ghost"><Activity size={18} /> Eventos</Link>
        </div>
      </div>
      {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(providerLabels).map(([provider, label]) => {
          const status = providerStatus(providers[provider]);
          const endpoint = provider === "whatsapp" ? urls.whatsappWebhookUrl : provider === "api_public" ? urls.apiPublicUrl : providers[provider]?.publicUrl;
          return (
            <article key={provider} className="glass flex flex-col gap-4 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">{providers[provider]?.lastError || providers[provider]?.source || "status seguro"}</p>
                </div>
                <StatusPill status={status} />
              </div>
              <div className="grid gap-2 text-sm text-slate-400">
                <span>Configurado: {String(Boolean(providers[provider]?.configured))}</span>
                {providers[provider]?.apiKeyConfigured !== undefined && <span>API key: {providers[provider].apiKeyConfigured ? providers[provider].apiKeyMasked || "configurada" : "ausente"}</span>}
                {providers[provider]?.tokenConfigured !== undefined && <span>Token: {providers[provider].tokenConfigured ? providers[provider].tokenMasked || "configurado" : "ausente"}</span>}
                {endpoint && <span className="truncate">Endpoint: {endpoint}</span>}
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => test(provider)}><FlaskConical size={16} /> Testar</button>
                {(provider === "n8n" || provider === "whatsapp" || provider === "evolution") && <button type="button" className="btn btn-ghost" onClick={() => bootstrap(provider)}><RefreshCw size={16} /> Bootstrap</button>}
                {endpoint && <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(endpoint)}><Clipboard size={16} /> Copiar</button>}
                {provider === "n8n" && urls.n8nPublicUrl && <a className="btn btn-ghost" href={urls.n8nPublicUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir</a>}
                <Link className="btn btn-ghost" to="/logs"><FileText size={16} /> Logs</Link>
              </div>
            </article>
          );
        })}
      </div>
      <div className="glass rounded-2xl p-5 text-sm text-slate-300">
        <p className="flex items-center gap-2 font-semibold text-white"><ShieldCheck size={18} className="text-cyanx" /> Regras de seguranca</p>
        <p className="mt-2">O frontend recebe apenas flags, mascaras e status. Chaves, tokens e secrets ficam criptografados no backend. WhatsApp exige "ei jarvis" e extratos OFX/CSV sempre viram previa antes de importar.</p>
      </div>
    </section>
  );
}
