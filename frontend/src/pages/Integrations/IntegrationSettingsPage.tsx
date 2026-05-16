import { FormEvent, useEffect, useState } from "react";
import { Copy, Save, ShieldCheck } from "lucide-react";
import { api, friendlyError } from "../../services/api";

const defaultUrls = {
  frontendPublicUrl: "https://jarvis.juninnzxtec.com.br",
  apiPublicUrl: "https://apijarvis.juninnzxtec.com.br/api",
  whatsappWebhookUrl: "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook",
  n8nPublicUrl: "https://n8njarvis.juninnzxtec.com.br"
};

export function IntegrationSettingsPage() {
  const [status, setStatus] = useState<any>({});
  const [urls, setUrls] = useState(defaultUrls);
  const [n8n, setN8n] = useState({ webhookUrl: "", apiKey: "", webhookSecret: "", enabled: true });
  const [whatsapp, setWhatsapp] = useState({ apiUrl: "", apiKey: "", instance: "", autoReply: false });
  const [homeAssistant, setHomeAssistant] = useState({ url: "", token: "" });
  const [finance, setFinance] = useState({ apiUrl: "", token: "", defaultAccountName: "PJ DO INTER", defaultAccountId: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get("/integrations/config");
    setStatus(res.data);
    setUrls({ ...defaultUrls, ...(res.data.urls || {}) });
    setN8n((current) => ({ ...current, webhookUrl: res.data.providers?.n8n?.webhookUrl || "", enabled: res.data.providers?.n8n?.enabled ?? true }));
    setWhatsapp((current) => ({ ...current, apiUrl: res.data.providers?.whatsapp?.apiUrl || "", instance: res.data.providers?.whatsapp?.instance || "", autoReply: Boolean(res.data.providers?.whatsapp?.autoReply) }));
    setHomeAssistant((current) => ({ ...current, url: res.data.providers?.home_assistant?.url || "" }));
    setFinance((current) => ({ ...current, apiUrl: res.data.providers?.finance?.apiUrl || "", defaultAccountName: res.data.providers?.finance?.defaultAccountName || "PJ DO INTER" }));
  }

  useEffect(() => { load().catch(() => setMessage("Nao foi possivel carregar configuracoes.")); }, []);

  async function save(provider: string, payload: Record<string, unknown>) {
    setMessage("");
    try {
      await api.put(`/integrations/config/${provider}`, payload);
      setMessage(`Configuracao ${provider} salva com seguranca.`);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  function submit(provider: string, payload: Record<string, unknown>) {
    return (event: FormEvent) => {
      event.preventDefault();
      void save(provider, payload);
    };
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-black text-white">Configuracoes de Integracoes</h2>
        <p className="text-slate-400">Edite endpoints e credenciais sem que o frontend veja valores reais.</p>
      </div>
      {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      <form onSubmit={submit("api_public", urls)} className="glass space-y-3 rounded-2xl p-5">
        <h3 className="font-bold text-white">API publica e webhooks</h3>
        {Object.entries(urls).map(([key, value]) => (
          <label key={key} className="block text-sm font-semibold text-slate-300">
            {key}
            <div className="mt-2 flex gap-2">
              <input className="input" value={value} onChange={(e) => setUrls({ ...urls, [key]: e.target.value })} />
              <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(value)}><Copy size={16} /></button>
            </div>
          </label>
        ))}
        <button className="btn btn-primary"><Save size={18} /> Salvar URLs</button>
      </form>
      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={submit("n8n", n8n)} className="glass space-y-3 rounded-2xl p-5">
          <h3 className="font-bold text-white">n8n</h3>
          <input className="input" value={n8n.webhookUrl} onChange={(e) => setN8n({ ...n8n, webhookUrl: e.target.value })} placeholder="Webhook URL do workflow JARVIS" />
          <input className="input" type="password" value={n8n.apiKey} onChange={(e) => setN8n({ ...n8n, apiKey: e.target.value })} placeholder={status.providers?.n8n?.apiKeyConfigured ? "API key configurada" : "API key opcional"} />
          <input className="input" type="password" value={n8n.webhookSecret} onChange={(e) => setN8n({ ...n8n, webhookSecret: e.target.value })} placeholder={status.providers?.n8n?.webhookSecretConfigured ? "Webhook secret configurado" : "Webhook secret opcional"} />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={n8n.enabled} onChange={(e) => setN8n({ ...n8n, enabled: e.target.checked })} /> n8n habilitado</label>
          <button className="btn btn-primary"><Save size={18} /> Salvar n8n</button>
        </form>
        <form onSubmit={submit("whatsapp", whatsapp)} className="glass space-y-3 rounded-2xl p-5">
          <h3 className="font-bold text-white">Evolution API / WhatsApp</h3>
          <input className="input" value={whatsapp.apiUrl} onChange={(e) => setWhatsapp({ ...whatsapp, apiUrl: e.target.value })} placeholder="https://evolution.seudominio.com.br" />
          <input className="input" value={whatsapp.instance} onChange={(e) => setWhatsapp({ ...whatsapp, instance: e.target.value })} placeholder="Instance" />
          <input className="input" type="password" value={whatsapp.apiKey} onChange={(e) => setWhatsapp({ ...whatsapp, apiKey: e.target.value })} placeholder={status.providers?.whatsapp?.apiKeyConfigured ? "API key configurada" : "API key da Evolution"} />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={whatsapp.autoReply} onChange={(e) => setWhatsapp({ ...whatsapp, autoReply: e.target.checked })} /> autoReply</label>
          <p className="text-xs text-slate-500">Wake phrase obrigatoria: ei jarvis. Grupos e fromMe sao ignorados.</p>
          <button className="btn btn-primary"><Save size={18} /> Salvar WhatsApp</button>
        </form>
        <form onSubmit={submit("home_assistant", homeAssistant)} className="glass space-y-3 rounded-2xl p-5">
          <h3 className="font-bold text-white">Home Assistant</h3>
          <input className="input" value={homeAssistant.url} onChange={(e) => setHomeAssistant({ ...homeAssistant, url: e.target.value })} placeholder="http://homeassistant.local:8123" />
          <input className="input" type="password" value={homeAssistant.token} onChange={(e) => setHomeAssistant({ ...homeAssistant, token: e.target.value })} placeholder={status.providers?.home_assistant?.tokenConfigured ? "Token configurado" : "Long-lived token"} />
          <p className="text-xs text-slate-500">Acoes de lock/alarm/cover/garage exigem confirmacao explicita.</p>
          <button className="btn btn-primary"><Save size={18} /> Salvar Home Assistant</button>
        </form>
        <form onSubmit={submit("finance", finance)} className="glass space-y-3 rounded-2xl p-5">
          <h3 className="font-bold text-white">Financeiro externo</h3>
          <input className="input" value={finance.apiUrl} onChange={(e) => setFinance({ ...finance, apiUrl: e.target.value })} placeholder="https://controlefinanceiro..." />
          <input className="input" type="password" value={finance.token} onChange={(e) => setFinance({ ...finance, token: e.target.value })} placeholder={status.providers?.finance?.tokenConfigured ? "Token configurado" : "Token opcional"} />
          <input className="input" value={finance.defaultAccountName} onChange={(e) => setFinance({ ...finance, defaultAccountName: e.target.value })} placeholder="PJ DO INTER" />
          <input className="input" value={finance.defaultAccountId} onChange={(e) => setFinance({ ...finance, defaultAccountId: e.target.value })} placeholder="ID da conta opcional" />
          <p className="text-xs text-slate-500">Importacoes OFX/CSV continuam exigindo revisao no painel.</p>
          <button className="btn btn-primary"><Save size={18} /> Salvar Financeiro</button>
        </form>
      </div>
      <div className="glass rounded-2xl p-5 text-sm text-slate-300">
        <p className="flex items-center gap-2 font-semibold text-white"><ShieldCheck size={18} className="text-cyanx" /> OpenAI e Gemini</p>
        <p className="mt-2">Chaves de IA permanecem em variaveis de ambiente ou secret manager do backend. O painel mostra apenas status/modelo e nunca recebe a chave real.</p>
      </div>
    </section>
  );
}
