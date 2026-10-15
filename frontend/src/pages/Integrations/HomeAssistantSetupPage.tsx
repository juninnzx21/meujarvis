import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Home, KeyRound, Link2, LoaderCircle, ShieldCheck, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { api, friendlyError } from "../../services/api";

type HomeAssistantStatus = {
  configured?: boolean;
  status?: string;
  urlConfigured?: boolean;
  tokenConfigured?: boolean;
};

type ConnectionResult = "idle" | "success" | "error";

function validHomeAssistantUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function HomeAssistantSetupPage() {
  const [status, setStatus] = useState<HomeAssistantStatus>({});
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<ConnectionResult>("idle");
  const [entitySummary, setEntitySummary] = useState<Record<string, number> | null>(null);
  const [message, setMessage] = useState("");

  async function loadStatus() {
    const response = await api.get("/home-assistant/status");
    setStatus(response.data);
  }

  useEffect(() => {
    void loadStatus().catch((error) => setMessage(friendlyError(error)));
  }, []);

  async function testAndDiscover() {
    setConnection("idle");
    setEntitySummary(null);
    const test = await api.post("/integrations/setup/home_assistant/test");
    if (test.data.status !== "success" && test.data.status !== "configured") {
      setConnection("error");
      setMessage(test.data.message || "O Home Assistant não confirmou a conexão. Confira URL e token.");
      return;
    }
    const entities = await api.get("/home-assistant/entities");
    const grouped = entities.data.grouped && typeof entities.data.grouped === "object" ? entities.data.grouped as Record<string, unknown[]> : {};
    setEntitySummary(Object.fromEntries(Object.entries(grouped).map(([domain, items]) => [domain, items.length])));
    setConnection("success");
    setMessage("Conexão confirmada e entidades descobertas. Nenhum dispositivo foi acionado.");
    await loadStatus();
  }

  async function saveAndTest(event?: FormEvent) {
    event?.preventDefault();
    setMessage("");
    if (!validHomeAssistantUrl(url)) {
      setConnection("error");
      setMessage("Informe a URL completa do Home Assistant começando com http:// ou https://, sem usuário, senha ou parâmetros.");
      return;
    }
    if (!status.tokenConfigured && !token.trim()) {
      setConnection("error");
      setMessage("Cole o token de longa duração gerado no perfil do Home Assistant.");
      return;
    }
    setBusy(true);
    try {
      await api.put("/integrations/setup/home_assistant", { url: url.trim().replace(/\/+$/, ""), token: token.trim() });
      setToken("");
      setMessage("Configuração salva criptografada. Testando a conexão e procurando entidades...");
      await testAndDiscover();
    } catch (error) {
      setConnection("error");
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function retest() {
    setBusy(true);
    setMessage("Testando Home Assistant e procurando entidades...");
    try {
      await testAndDiscover();
    } catch (error) {
      setConnection("error");
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  const configured = Boolean(status.configured);

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-400/15 p-3 text-cyan-100"><Home size={24} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Vínculo assistido</p>
            <h2 className="text-2xl font-black text-white">Conectar Home Assistant</h2>
            <p className="text-sm text-slate-400">Conexão segura, teste de API e descoberta somente leitura dos dispositivos.</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm ${configured ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>
          {configured ? "Credenciais configuradas" : "Aguardando configuração"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="glass rounded-2xl p-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/15 font-black text-cyan-100">1</span>
          <h3 className="mt-3 font-bold text-white">Abra seu Home Assistant</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">Entre na sua instância e abra o seu perfil. Acesse a área de segurança e crie um token de longa duração.</p>
          <a className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-200 underline" href="https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token" target="_blank" rel="noreferrer">Ver documentação oficial <ExternalLink size={14} /></a>
        </article>
        <article className="glass rounded-2xl p-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/15 font-black text-cyan-100">2</span>
          <h3 className="mt-3 font-bold text-white">Crie e copie o token</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">No fim do perfil, crie um token chamado “JARVIS”. Copie-o uma única vez. O token não é enviado por e-mail nem exibido novamente pelo painel.</p>
        </article>
        <article className="glass rounded-2xl p-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/15 font-black text-cyan-100">3</span>
          <h3 className="mt-3 font-bold text-white">Teste e descubra</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">Informe a URL acessível pela VPS. O teste consulta a API e lista entidades sem ligar luzes, abrir portas ou acionar dispositivos.</p>
        </article>
      </div>

      <form onSubmit={(event) => void saveAndTest(event)} className="glass space-y-4 rounded-2xl p-5">
        <div className="flex items-center gap-2 font-bold text-white"><Link2 size={18} className="text-cyanx" /> Dados de conexão</div>
        <label className="block text-sm font-semibold text-slate-300">
          URL do Home Assistant
          <input className="input mt-2" type="url" autoComplete="url" placeholder="https://casa.seudominio.com.br ou http://IP-DA-VPS:8123" value={url} onChange={(event) => setUrl(event.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-300">
          Token de longa duração
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3">
            <KeyRound size={16} className="text-slate-500" />
            <input className="min-h-12 flex-1 bg-transparent text-sm text-white outline-none" type="password" autoComplete="new-password" value={token} onChange={(event) => setToken(event.target.value)} placeholder={status.tokenConfigured ? "Token já salvo; deixe vazio para manter" : "Cole o token criado no perfil do Home Assistant"} required={!status.tokenConfigured} />
          </div>
          <span className="mt-2 block text-xs text-slate-500">A URL e o token são salvos criptografados no backend. O campo fica vazio depois de salvar.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy}><ShieldCheck size={18} /> {busy ? <><LoaderCircle size={16} className="animate-spin" /> Testando vínculo...</> : "Salvar e testar vínculo"}</button>
          {configured && <button type="button" className="btn btn-ghost" onClick={() => void retest()} disabled={busy}><Wifi size={17} /> Testar novamente</button>}
          {connection === "success" && <Link to="/smart-home" className="btn btn-ghost"><Home size={17} /> Abrir Casa Inteligente</Link>}
        </div>
        {message && <p role="status" className={`rounded-xl p-3 text-sm ${connection === "error" ? "border border-rose-400/30 bg-rose-500/10 text-rose-100" : "bg-white/5 text-slate-200"}`}>{message}</p>}
        {connection === "success" && <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><p>Vínculo ativo. Dispositivos descobertos: {Object.values(entitySummary || {}).reduce((sum, count) => sum + count, 0)}{entitySummary && Object.entries(entitySummary).length > 0 ? ` (${Object.entries(entitySummary).map(([domain, count]) => `${domain}: ${count}`).join(", ")})` : ". Nenhuma entidade foi retornada."}</p></div>}
      </form>

      <div className="glass flex items-start gap-3 rounded-2xl p-4 text-sm text-amber-100">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <p>O vínculo não executa ações nos dispositivos. Comandos de fechadura, alarme, portão e garagem continuam exigindo confirmação explícita no JARVIS.</p>
      </div>
    </section>
  );
}
