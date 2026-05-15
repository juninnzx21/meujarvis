import { FormEvent, useEffect, useState } from "react";
import { Copy, FlaskConical, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";

export function WhatsAppPage() {
  const [status, setStatus] = useState<any>({});
  const [config, setConfig] = useState({ apiUrl: "", apiKey: "", instance: "", autoReply: false });
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const webhookUrl = "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook";

  async function load() {
    const [statusRes, configRes] = await Promise.all([api.get("/whatsapp/status"), api.get("/whatsapp/config")]);
    setStatus(statusRes.data);
    setConfig({
      apiUrl: configRes.data.apiUrl || "",
      apiKey: "",
      instance: configRes.data.instance || "",
      autoReply: Boolean(configRes.data.autoReply)
    });
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    const res = await api.put("/whatsapp/config", config);
    setStatus(res.data);
    setConfig((current) => ({ ...current, apiKey: "" }));
    setMessage("Configuracao WhatsApp/Evolution salva com seguranca.");
  }

  async function clearConfig() {
    const res = await api.delete("/whatsapp/config");
    setStatus(res.data);
    setConfig({ apiUrl: "", apiKey: "", instance: "", autoReply: false });
    setMessage("Configuracao removida.");
  }

  async function testConnection() {
    const res = await api.post("/whatsapp/test-connection");
    setMessage(res.data.message || (res.data.status === "success" ? "Evolution API respondeu com sucesso." : res.data.status));
    await load();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      setMessage("Informe um numero com DDI, somente digitos, entre 10 e 15 caracteres.");
      return;
    }
    if (!confirmed) {
      setMessage("Confirme explicitamente antes de enviar uma mensagem de teste.");
      return;
    }
    const res = await api.post("/whatsapp/send", { phone: cleanPhone, content, confirmed: true });
    setMessage(res.data.message || "Mensagem processada.");
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <form onSubmit={saveConfig} className="glass space-y-4 rounded-2xl p-5">
        <h2 className="text-3xl font-black text-white">WhatsApp</h2>
        <p className="text-sm text-slate-400">Configure a Evolution API para o JARVIS receber mensagens, executar comandos seguros e responder quando autorizado.</p>
        <label className="block text-sm font-semibold text-slate-300">
          URL da Evolution API
          <input className="input mt-2" value={config.apiUrl} onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })} placeholder="https://evolution.seudominio.com.br" />
        </label>
        <label className="block text-sm font-semibold text-slate-300">
          Instancia
          <input className="input mt-2" value={config.instance} onChange={(e) => setConfig({ ...config, instance: e.target.value })} placeholder="jarvis" />
        </label>
        <label className="block text-sm font-semibold text-slate-300">
          API Key
          <input className="input mt-2" type="password" value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} placeholder={status.apiKeyMasked ? `Atual: ${status.apiKeyMasked}` : "Cole a API key da Evolution"} />
          <span className="mt-1 block text-xs text-slate-500">Deixe em branco para manter a chave atual. O JARVIS nunca mostra a chave salva.</span>
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
          <span>Resposta automatica pelo WhatsApp</span>
          <input type="checkbox" checked={config.autoReply} onChange={(e) => setConfig({ ...config, autoReply: e.target.checked })} />
        </label>
        <div className="rounded-xl border border-cyan-400/15 bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Webhook para configurar na Evolution API</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input className="input" readOnly value={webhookUrl} />
            <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(webhookUrl)}><Copy size={18} /> Copiar</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary"><Save size={18} /> Salvar configuracao</button>
          <button type="button" onClick={testConnection} className="btn btn-ghost"><FlaskConical size={18} /> Testar conexao</button>
          <button type="button" onClick={clearConfig} className="btn btn-ghost"><Trash2 size={18} /> Limpar</button>
        </div>
        {message && <p className="rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </form>

      <form onSubmit={send} className="glass space-y-4 rounded-2xl p-5">
        <h3 className="text-xl font-black text-white">Mensagem de teste</h3>
        <p className="text-sm text-slate-400">Envio individual via Evolution API, sempre com confirmacao.</p>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numero com DDI. Ex: 5511999999999" />
        <textarea className="input min-h-32" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Mensagem de teste" />
        <label className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Confirmo que este e um envio individual de teste autorizado.
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary"><Send size={18} /> Enviar teste</button>
        </div>
      </form>

      <aside className="glass rounded-2xl p-5 xl:col-span-2">
        <h3 className="mb-3 font-bold text-white">Status</h3>
        <StatusPill status={status.status} />
        <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-2 lg:grid-cols-4">
          <span>Fonte: {status.source || "settings"}</span>
          <span>URL: {status.apiUrlConfigured ? "configurada" : "ausente"}</span>
          <span>Instancia: {status.instanceConfigured ? status.instance : "ausente"}</span>
          <span>API key: {status.apiKeyConfigured ? status.apiKeyMasked : "ausente"}</span>
        </div>
        <div className="mt-4 flex items-start gap-2 text-sm text-slate-400">
          <ShieldCheck size={18} className="shrink-0 text-cyanx" />
          <p>Auto reply: {String(status.autoReply)}. Para evitar spam, mantenha desligado ate validar o webhook e os comandos. Credenciais permanecem somente no backend.</p>
        </div>
        <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-slate-400">
          <p className="font-semibold text-slate-200">Comandos por texto e audio</p>
          <p className="mt-1">Com o webhook ativo, mensagens como "crie uma tarefa para amanha as 9h" passam pelo orquestrador do JARVIS. Audios enviados pela Evolution API sao transcritos pela OpenAI quando a midia vier no payload como base64 ou URL.</p>
        </div>
      </aside>
    </section>
  );
}
