import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Copy, FlaskConical, LogOut, QrCode, RefreshCw, Save, Send, ShieldCheck, Trash2, Wifi } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

const webhookUrl = "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook";

type EvolutionState = {
  status?: string;
  configured?: boolean;
  connectionState?: string;
  instance?: string;
  qrCodeDataUrl?: string | null;
  pairingCode?: string | null;
  canRenderQr?: boolean;
  manualActionRequired?: boolean;
  checklist?: string[];
  message?: string;
};

export function WhatsAppPage() {
  const [status, setStatus] = useState<any>({});
  const [evolution, setEvolution] = useState<EvolutionState>({});
  const [config, setConfig] = useState({ apiUrl: "", apiKey: "", instance: "", autoReply: false });
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("ei jarvis status do sistema");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef<number | undefined>();

  const connectionLabel = useMemo(() => {
    const state = evolution.connectionState || "unknown";
    if (state === "connected") return "connected/open";
    if (state === "disconnected") return "disconnected";
    return state;
  }, [evolution.connectionState]);

  async function load() {
    const [statusRes, configRes, evolutionRes] = await Promise.all([
      api.get("/whatsapp/status"),
      api.get("/whatsapp/config"),
      api.get("/whatsapp/evolution/status")
    ]);
    setStatus(statusRes.data);
    setEvolution(evolutionRes.data);
    setConfig({
      apiUrl: configRes.data.apiUrl || "",
      apiKey: "",
      instance: configRes.data.instance || "",
      autoReply: Boolean(configRes.data.autoReply)
    });
  }

  useEffect(() => {
    load().catch((error) => setMessage(friendlyError(error)));
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, []);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    if (/^https?:\/\//i.test(config.apiKey.trim())) {
      setMessage("O campo API Key recebeu uma URL. Cole a chave da Evolution API, nao o webhook.");
      return;
    }
    const res = await api.put("/whatsapp/config", config);
    setStatus(res.data);
    setConfig((current) => ({ ...current, apiKey: "" }));
    setMessage("Configuracao WhatsApp/Evolution salva com seguranca.");
    await load();
  }

  async function clearConfig() {
    try {
      const res = await api.delete("/whatsapp/config");
      setStatus(res.data);
      setEvolution({});
      setConfig({ apiUrl: "", apiKey: "", instance: "", autoReply: false });
      setMessage("Configuracao removida.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function testConnection() {
    try {
      const res = await api.post("/whatsapp/evolution/test-connection");
      setEvolution((current) => ({ ...current, ...res.data }));
      setMessage(res.data.message || (res.data.status === "success" ? "Evolution API respondeu com sucesso." : res.data.status));
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function createInstance() {
    try {
      const res = await api.post("/whatsapp/evolution/instances", { instanceName: config.instance || "jarvis" });
      setEvolution((current) => ({ ...current, ...res.data }));
      setMessage(res.data.message || "Instancia criada ou localizada.");
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function refreshConnectionState() {
    const params = config.instance ? `?instanceName=${encodeURIComponent(config.instance)}` : "";
    const res = await api.get(`/whatsapp/evolution/connection-state${params}`);
    setEvolution((current) => ({ ...current, ...res.data }));
    setMessage(res.data.message || `Status da instancia: ${res.data.connectionState || "unknown"}`);
    return res.data;
  }

  function startPolling() {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    setPolling(true);
    const startedAt = Date.now();
    pollingRef.current = window.setInterval(async () => {
      try {
        const data = await refreshConnectionState();
        if (data.connectionState === "connected" || Date.now() - startedAt > 120000) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          setPolling(false);
        }
      } catch {
        if (Date.now() - startedAt > 120000) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          setPolling(false);
        }
      }
    }, 4000);
  }

  async function generateQr() {
    try {
      const res = await api.post("/whatsapp/evolution/connect", { instanceName: config.instance || undefined });
      setEvolution((current) => ({ ...current, ...res.data }));
      setMessage(res.data.message || "QR Code solicitado.");
      if (res.data.qrCodeDataUrl || res.data.connectionState === "connecting") startPolling();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function configureWebhook() {
    try {
      const res = await api.post("/whatsapp/evolution/configure-webhook", { instanceName: config.instance || undefined, webhookUrl });
      setEvolution((current) => ({ ...current, ...res.data }));
      setMessage(res.data.message || res.data.status);
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function logoutInstance() {
    try {
      const res = await api.post("/whatsapp/evolution/logout", { instanceName: config.instance || undefined });
      setEvolution((current) => ({ ...current, ...res.data }));
      setMessage(res.data.message || "Comando enviado.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
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
    try {
      const res = await api.post("/whatsapp/send", { phone: cleanPhone, content, confirmed: true });
      setMessage(res.data.message || "Mensagem processada.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="text-3xl font-black text-white">WhatsApp</h2>
        <p className="mt-2 text-sm text-slate-400">Conecte a Evolution API, gere QR Code no JARVIS e mantenha o webhook seguro com a frase obrigatoria "ei jarvis".</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <form onSubmit={saveConfig} className="glass space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-white">1. Configurar Evolution</h3>
            <StatusPill status={status.status} />
          </div>
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
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary"><Save size={18} /> Salvar configuracao</button>
            <button type="button" onClick={testConnection} className="btn btn-ghost"><FlaskConical size={18} /> Testar conexao</button>
            <button type="button" onClick={clearConfig} className="btn btn-ghost"><Trash2 size={18} /> Limpar</button>
          </div>
          <div className="grid gap-3 text-sm text-slate-400 md:grid-cols-2">
            <span>URL: {status.apiUrlConfigured ? "configurada" : "ausente"}</span>
            <span>Instancia: {status.instanceConfigured ? status.instance : "ausente"}</span>
            <span>API key: {status.apiKeyConfigured ? status.apiKeyMasked : "ausente"}</span>
            <span>Auto reply: {String(status.autoReply)}</span>
          </div>
        </form>

        <div className="glass space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-white">2. Instancia e QR Code</h3>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-200">{connectionLabel}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={createInstance} className="btn btn-ghost"><Wifi size={18} /> Criar instancia</button>
            <button type="button" onClick={() => refreshConnectionState().catch((error) => setMessage(friendlyError(error)))} className="btn btn-ghost"><RefreshCw size={18} /> Verificar status</button>
            <button type="button" onClick={generateQr} className="btn btn-primary"><QrCode size={18} /> Gerar QR Code</button>
            <button type="button" onClick={logoutInstance} className="btn btn-ghost"><LogOut size={18} /> Desconectar</button>
          </div>
          {polling && <p className="rounded-xl bg-cyan-400/10 p-3 text-sm text-cyan-100">Aguardando conexao do WhatsApp...</p>}
          {evolution.qrCodeDataUrl && evolution.connectionState !== "connected" && (
            <div className="rounded-xl bg-white p-4 text-center">
              <img src={evolution.qrCodeDataUrl} alt="QR Code para conectar WhatsApp" className="mx-auto h-64 w-64" />
            </div>
          )}
          {evolution.pairingCode && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-200">Pairing code: <strong>{evolution.pairingCode}</strong></p>}
          {evolution.connectionState === "connected" && <p className="rounded-xl bg-cyan-400/10 p-3 text-sm font-bold text-cyan-100">WhatsApp conectado.</p>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <div className="glass space-y-4 rounded-2xl p-5">
          <h3 className="text-xl font-black text-white">3. Webhook</h3>
          <div className="rounded-xl border border-cyan-400/15 bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Webhook oficial</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input className="input" readOnly value={webhookUrl} />
              <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(webhookUrl)}><Copy size={18} /> Copiar</button>
            </div>
          </div>
          <button type="button" onClick={configureWebhook} className="btn btn-primary"><ShieldCheck size={18} /> Configurar webhook automaticamente</button>
          {evolution.manualActionRequired && (
            <div className="rounded-xl bg-amber-400/10 p-4 text-sm text-amber-100">
              <p className="font-bold">Acao manual necessaria</p>
              {(evolution.checklist || []).map((item) => <p key={item} className="mt-1">- {item}</p>)}
            </div>
          )}
        </div>

        <form onSubmit={send} className="glass space-y-4 rounded-2xl p-5">
          <h3 className="text-xl font-black text-white">4. Testes</h3>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numero com DDI. Ex: 5511999999999" />
          <textarea className="input min-h-28" value={content} onChange={(e) => setContent(e.target.value)} placeholder="ei jarvis status do sistema" />
          <label className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            Confirmo que este e um envio individual de teste autorizado.
          </label>
          <button className="btn btn-primary"><Send size={18} /> Enviar teste</button>
          <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">
            <p className="font-bold text-slate-200">Teste real no WhatsApp</p>
            <p>ei jarvis status do sistema</p>
            <p>ei jarvis quais tarefas tenho hoje?</p>
            <p>ei jarvis entrada pix recebido R$ 120,00 cliente Joao</p>
            <p>ei jarvis importar esse extrato do Inter</p>
          </div>
        </form>
      </div>
    </section>
  );
}
