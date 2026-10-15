import { FormEvent, useEffect, useState } from "react";
import { Copy, RefreshCw, Save, ShieldCheck } from "lucide-react";
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
  const [finance, setFinance] = useState({ apiUrl: "https://controlefinanceiro.juninnzxtec.com.br", email: "", password: "", twoFactorCode: "", challengeToken: "", defaultAccountName: "PJ DO INTER" });
  const [financeBusy, setFinanceBusy] = useState(false);
  const [openai, setOpenai] = useState({ apiKey: "", model: "gpt-4o-mini" });
  const [gemini, setGemini] = useState({ apiKey: "", model: "gemini-2.5-flash" });
  const [ollama, setOllama] = useState({ baseUrl: "", model: "llama3.2:3b" });
  const [tts, setTts] = useState({ provider: "auto", autoPreferredProvider: "fish_audio", allowElevenLabsFallback: false, fishAudioApiKey: "", fishAudioVoiceId: "", elevenlabsApiKey: "", elevenlabsVoiceId: "", elevenlabsModelId: "eleven_multilingual_v2" });
  const [ttsVoices, setTtsVoices] = useState<{ elevenlabs: Array<{ id: string; name: string; language: string; gender?: string }> }>({ elevenlabs: [] });
  const [ttsBusy, setTtsBusy] = useState("");
  const [ttsQuotas, setTtsQuotas] = useState<Record<string, { status: string; remaining: number | null; limit: number | null; used: number | null; message: string }> | null>(null);
  const [primaryProvider, setPrimaryProvider] = useState<"auto" | "openai" | "gemini" | "ollama">("auto");
  const [modelOptions, setModelOptions] = useState<{ openai: string[]; gemini: string[]; ollama: string[] }>({ openai: [], gemini: [], ollama: [] });
  const [modelsLoading, setModelsLoading] = useState<"openai" | "gemini" | "ollama" | "">("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get("/integrations/config");
    setStatus(res.data);
    setUrls({ ...defaultUrls, ...(res.data.urls || {}) });
    setN8n((current) => ({ ...current, webhookUrl: res.data.providers?.n8n?.webhookUrl || "", enabled: res.data.providers?.n8n?.enabled ?? true }));
    setWhatsapp((current) => ({ ...current, apiUrl: res.data.providers?.whatsapp?.apiUrl || "", instance: res.data.providers?.whatsapp?.instance || "", autoReply: Boolean(res.data.providers?.whatsapp?.autoReply) }));
    setHomeAssistant((current) => ({ ...current, url: res.data.providers?.home_assistant?.url || "" }));
    setFinance((current) => ({ ...current, apiUrl: res.data.providers?.finance?.apiUrl || "https://controlefinanceiro.juninnzxtec.com.br", email: res.data.providers?.finance?.userEmail || current.email, defaultAccountName: res.data.providers?.finance?.defaultAccountName || "PJ DO INTER" }));
    setOpenai({ apiKey: "", model: res.data.providers?.openai?.model || "gpt-4o-mini" });
    setGemini({ apiKey: "", model: res.data.providers?.gemini?.model || "gemini-2.5-flash" });
    setOllama({ baseUrl: res.data.providers?.ollama?.baseUrl || "", model: res.data.providers?.ollama?.model || "llama3.2:3b" });
    setTts((current) => ({ ...current, provider: res.data.providers?.tts?.provider || "auto", autoPreferredProvider: res.data.providers?.tts?.autoPreferredProvider || "fish_audio", allowElevenLabsFallback: Boolean(res.data.providers?.tts?.allowElevenLabsFallback), fishAudioVoiceId: res.data.providers?.tts?.fishAudio?.voiceId || "", elevenlabsVoiceId: res.data.providers?.tts?.elevenlabs?.voiceId || "", elevenlabsModelId: res.data.providers?.tts?.elevenlabs?.modelId || "eleven_multilingual_v2" }));
    setPrimaryProvider(res.data.providers?.ai_selection?.primaryProvider || "auto");
  }

  useEffect(() => { load().catch(() => setMessage("Nao foi possivel carregar configuracoes.")); }, []);

  async function save(provider: string, payload: Record<string, unknown>) {
    setMessage("");
    try {
      await api.put(`/integrations/config/${provider}`, payload);
      if (provider === "tts") window.dispatchEvent(new Event("jarvis-tts-config-updated"));
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

  async function loadModels(provider: "openai" | "gemini" | "ollama") {
    setModelsLoading(provider);
    setMessage(`Carregando modelos ${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "Ollama"}...`);
    try {
      const result = await api.get(`/integrations/models/${provider}`);
      const models = Array.isArray(result.data.models) ? result.data.models as string[] : [];
      setModelOptions((current) => ({ ...current, [provider]: models }));
      setMessage(models.length ? `${models.length} modelos disponíveis carregados.` : result.data.message || "Nenhum modelo instalado ou compatível foi encontrado.");
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setModelsLoading("");
    }
  }

  async function test(provider: "openai" | "gemini" | "ollama") {
    setMessage(`Testando ${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "Ollama"}...`);
    try {
      const result = await api.post(`/integrations/test/${provider}`);
      const label = result.data.status === "success" ? "conexão confirmada" : result.data.message || result.data.status;
      setMessage(`${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "Ollama"}: ${label}.`);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function removeAiKey(provider: "openai" | "gemini", model: string) {
    const name = provider === "openai" ? "OpenAI" : "Gemini";
    if (!window.confirm(`Remover a chave ${name} salva no painel? Se houver uma chave no ambiente do servidor, ela continuará sendo usada.`)) return;
    await save(provider, { removeApiKey: true, model });
  }

  async function connectFinance(event: FormEvent) {
    event.preventDefault();
    setFinanceBusy(true);
    setMessage("");
    try {
      const result = finance.challengeToken
        ? await api.post("/finance/auth/challenge", {
            apiUrl: finance.apiUrl,
            email: finance.email,
            challengeToken: finance.challengeToken,
            code: finance.twoFactorCode,
            defaultAccountName: finance.defaultAccountName
          })
        : await api.post("/finance/auth/login", {
            apiUrl: finance.apiUrl,
            email: finance.email,
            password: finance.password,
            defaultAccountName: finance.defaultAccountName
          });
      if (result.data.status === "requires_2fa") {
        setFinance((current) => ({ ...current, password: "", challengeToken: result.data.challengeToken }));
        setMessage("O financeiro pediu 2FA. Digite o código temporário do autenticador e clique em Confirmar 2FA.");
      } else if (result.data.status === "configured") {
        setFinance((current) => ({ ...current, password: "", twoFactorCode: "", challengeToken: "" }));
        setMessage(result.data.message || "Controle Financeiro conectado com segurança.");
        await load();
      } else {
        setMessage(result.data.message || "Não foi possível conectar o Controle Financeiro.");
      }
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setFinanceBusy(false);
    }
  }

  async function testFinanceConnection() {
    setFinanceBusy(true);
    setMessage("Testando a conexão com o Controle Financeiro...");
    try {
      const result = await api.post("/finance/test-connection");
      setMessage(result.data.status === "success" ? "Conexão com o Controle Financeiro confirmada." : result.data.message || result.data.status);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setFinanceBusy(false);
    }
  }

  async function loadTtsVoices(provider: "elevenlabs") {
    setTtsBusy(`voices-${provider}`);
    try {
      if (tts.elevenlabsApiKey) {
        await api.put("/integrations/config/tts", tts);
        window.dispatchEvent(new Event("jarvis-tts-config-updated"));
      }
      const result = await api.get(`/integrations/tts/voices/${provider}`);
      const voices = Array.isArray(result.data.voices) ? result.data.voices : [];
      setTtsVoices((current) => ({ ...current, [provider]: voices }));
      setMessage(result.data.status === "success" ? `${voices.length} vozes ElevenLabs carregadas.` : result.data.message || "Configure e salve a chave antes de carregar as vozes.");
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setTtsBusy(""); }
  }

  async function testTts() {
    setTtsBusy("test");
    setMessage("Salvando as configurações atuais e gerando um áudio de teste...");
    try {
      await api.put("/integrations/config/tts", tts);
      window.dispatchEvent(new Event("jarvis-tts-config-updated"));
      const result = await api.post("/voice/speech", { text: "Olá! Esta é uma mensagem de teste de voz do JARVIS." }, { responseType: "blob" });
      if (!result.data || result.data.size === 0) throw new Error("O provedor não retornou áudio.");
      const audioUrl = URL.createObjectURL(result.data);
      const player = new Audio(audioUrl);
      player.onended = () => URL.revokeObjectURL(audioUrl);
      player.onerror = () => URL.revokeObjectURL(audioUrl);
      await player.play();
      const provider = result.headers?.["x-jarvis-tts-provider"];
      setMessage(`Áudio gerado e reproduzido com sucesso${provider ? ` usando ${provider}` : ""}.`);
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setTtsBusy(""); }
  }

  async function refreshTtsQuotas() {
    setTtsBusy("quotas");
    try {
      const result = await api.get("/integrations/tts/quotas");
      setTtsQuotas(result.data.providers || {});
      setMessage("Cotas consultadas diretamente nas contas dos provedores.");
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setTtsBusy(""); }
  }

  async function cloneJarvisVoice(file?: File) {
    if (!file) return;
    if (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")) {
      setMessage("Selecione um arquivo MP3.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage("O MP3 deve ter no máximo 8 MB.");
      return;
    }
    setTtsBusy("clone");
    try {
      if (tts.fishAudioApiKey) await api.put("/integrations/config/tts", { ...tts, provider: "fish_audio" });
      setMessage("Enviando o MP3 à Fish Audio para criar um modelo privado de voz...");
      const result = await api.post("/integrations/tts/fish-audio/clone?title=JARVIS%20-%20Voz%20personalizada", file, { headers: { "Content-Type": "audio/mpeg" }, timeout: 150000, transformRequest: [(data) => data] });
      const nextTts = { ...tts, provider: "fish_audio", fishAudioApiKey: "", fishAudioVoiceId: result.data.voiceId };
      setTts(nextTts);
      setMessage("Voz criada como privada na Fish Audio e selecionada para o JARVIS. Agora gere um teste de voz.");
      window.dispatchEvent(new Event("jarvis-tts-config-updated"));
      await load();
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setTtsBusy(""); }
  }

  async function disconnectFinance() {
    setFinanceBusy(true);
    setMessage("");
    try {
      await api.delete("/finance/auth");
      setFinance((current) => ({ ...current, password: "", twoFactorCode: "", challengeToken: "" }));
      setMessage("Controle Financeiro desvinculado; o token salvo foi removido.");
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setFinanceBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-black text-white">Configuracoes de Integracoes</h2>
        <p className="text-slate-400">Edite endpoints e credenciais sem que o frontend veja valores reais.</p>
      </div>
      {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      <div className="glass space-y-4 rounded-2xl p-5">
        <div>
          <h3 className="font-bold text-white">Inteligência artificial</h3>
          <p className="mt-1 text-sm text-slate-400">Escolha qual IA atende primeiro e qual modelo usar. Chat, Brain e respostas de voz seguem essa preferência; as chaves ficam criptografadas no backend.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-4">
          <label className="min-w-64 flex-1 text-sm font-semibold text-slate-300">IA principal das conversas
            <select className="input mt-2" value={primaryProvider} onChange={(event) => setPrimaryProvider(event.target.value as "auto" | "openai" | "gemini" | "ollama")}>
              <option value="auto">Automático (Ollama local primeiro; nuvem como reserva)</option>
              <option value="openai">OpenAI primeiro</option>
              <option value="gemini">Google Gemini primeiro</option>
              <option value="ollama">Ollama local primeiro</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void save("ai_selection", { primaryProvider })}><Save size={18} /> Salvar preferência</button>
          <p className="basis-full text-xs text-slate-500">No modo automático, Ollama local é tentado primeiro; se estiver indisponível, o JARVIS usa OpenAI e Gemini configurados.</p>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <form onSubmit={submit("openai", openai)} className="space-y-3 rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-white">OpenAI</h4><span className="text-xs text-slate-400">{status.providers?.openai?.configured ? `Configurada · ${status.providers.openai.source || "backend"}` : "Chave ausente"}</span></div>
            <input className="input" type="password" autoComplete="new-password" value={openai.apiKey} onChange={(e) => setOpenai({ ...openai, apiKey: e.target.value })} placeholder={status.providers?.openai?.configured ? "Chave já configurada; deixe vazio para manter" : "Cole sua chave da OpenAI"} />
            <label className="block text-xs font-semibold text-slate-400">Modelos liberados para sua conta
              <select className="input mt-2" value={modelOptions.openai.includes(openai.model) ? openai.model : ""} onChange={(e) => setOpenai({ ...openai, model: e.target.value })} aria-label="Selecionar modelo OpenAI">
                <option value="">Selecione após carregar a lista</option>
                {modelOptions.openai.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <div className="flex gap-2"><input className="input" value={openai.model} onChange={(e) => setOpenai({ ...openai, model: e.target.value })} placeholder="ID do modelo OpenAI" aria-label="ID do modelo OpenAI" /><button type="button" className="btn btn-ghost shrink-0" disabled={modelsLoading === "openai"} onClick={() => void loadModels("openai")}>{modelsLoading === "openai" ? "Carregando..." : "Carregar modelos"}</button></div>
            <div className="flex flex-wrap gap-2"><button className="btn btn-primary"><Save size={18} /> Salvar OpenAI</button><button type="button" className="btn btn-ghost" onClick={() => void test("openai")}>Testar conexão</button>{status.providers?.openai?.source === "painel" && <button type="button" className="btn btn-ghost" onClick={() => void removeAiKey("openai", openai.model)}>Remover chave</button>}</div>
          </form>
          <form onSubmit={submit("gemini", gemini)} className="space-y-3 rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-white">Google Gemini</h4><span className="text-xs text-slate-400">{status.providers?.gemini?.configured ? `Configurada · ${status.providers.gemini.source || "backend"}` : "Chave ausente"}</span></div>
            <input className="input" type="password" autoComplete="new-password" value={gemini.apiKey} onChange={(e) => setGemini({ ...gemini, apiKey: e.target.value })} placeholder={status.providers?.gemini?.configured ? "Chave já configurada; deixe vazio para manter" : "Cole sua chave do Gemini"} />
            <label className="block text-xs font-semibold text-slate-400">Modelos de geração liberados para sua conta
              <select className="input mt-2" value={modelOptions.gemini.includes(gemini.model) ? gemini.model : ""} onChange={(e) => setGemini({ ...gemini, model: e.target.value })} aria-label="Selecionar modelo Gemini">
                <option value="">Selecione após carregar a lista</option>
                {modelOptions.gemini.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <div className="flex gap-2"><input className="input" value={gemini.model} onChange={(e) => setGemini({ ...gemini, model: e.target.value })} placeholder="ID do modelo Gemini" aria-label="ID do modelo Gemini" /><button type="button" className="btn btn-ghost shrink-0" disabled={modelsLoading === "gemini"} onClick={() => void loadModels("gemini")}>{modelsLoading === "gemini" ? "Carregando..." : "Carregar modelos"}</button></div>
            <div className="flex flex-wrap gap-2"><button className="btn btn-primary"><Save size={18} /> Salvar Gemini</button><button type="button" className="btn btn-ghost" onClick={() => void test("gemini")}>Testar conexão</button>{status.providers?.gemini?.source === "painel" && <button type="button" className="btn btn-ghost" onClick={() => void removeAiKey("gemini", gemini.model)}>Remover chave</button>}</div>
          </form>
        </div>
        <form onSubmit={submit("ollama", ollama)} className="mt-5 space-y-3 rounded-xl border border-cyan-400/20 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-white">Ollama local / PC privado</h4><span className="text-xs text-slate-400">{status.providers?.ollama?.configured ? `Configurado · ${status.providers.ollama.status}` : "Ainda não conectado"}</span></div>
          <p className="text-sm text-slate-400">Ollama não exige chave. O endereço aceita apenas localhost ou IP privado da sua LAN/VPN; não publique a porta 11434.</p>
          <input className="input" value={ollama.baseUrl} onChange={(event) => setOllama({ ...ollama, baseUrl: event.target.value })} placeholder="http://100.80.12.34:11434 (IP privado da VPN)" aria-label="URL privada do Ollama" />
          <div className="flex gap-2"><input className="input" list="ollama-models" value={ollama.model} onChange={(event) => setOllama({ ...ollama, model: event.target.value })} placeholder="llama3.2:3b" aria-label="Modelo Ollama" /><datalist id="ollama-models">{modelOptions.ollama.map((model) => <option key={model} value={model} />)}</datalist><button type="button" className="btn btn-ghost shrink-0" disabled={modelsLoading === "ollama"} onClick={() => void loadModels("ollama")}>{modelsLoading === "ollama" ? "Carregando..." : "Listar modelos"}</button></div>
          <div className="flex flex-wrap gap-2"><button className="btn btn-primary"><Save size={18} /> Salvar Ollama</button><button type="button" className="btn btn-ghost" onClick={() => void test("ollama")}>Testar conexão</button></div>
          <p className="text-xs text-slate-500">Sugestão inicial: Llama 3.2 3B quantizado no PC. A inferência local ainda precisa ser instalada e testada neste computador.</p>
        </form>
        <p className="text-xs text-slate-500">Carregue a lista para escolher um modelo que sua chave realmente disponibiliza. Você também pode informar o ID manualmente. O teste de conexão verifica a credencial sem enviar uma pergunta de geração; o Chat e o Brain usam a IA principal escolhida e recorrem à outra quando necessário.</p>
      </div>
      <form onSubmit={submit("tts", tts)} className="glass space-y-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-white">Voz do JARVIS · Piper local, Fish Audio e ElevenLabs</h3><p className="mt-1 text-sm text-slate-400">Piper sintetiza em português na VPS sem chave externa. As chaves dos provedores remotos permanecem criptografadas no backend. No modo automático, o JARVIS tenta primeiro o motor local e só usa serviços remotos com cota confirmada.</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{status.providers?.tts?.status === "configured" ? `Modo: ${tts.provider}` : "Configure ou teste um motor"}</span></div>
        <label className="block text-sm font-semibold text-slate-300">Como escolher a voz<select className="input mt-2" value={tts.provider} onChange={(event) => setTts({ ...tts, provider: event.target.value })}><option value="auto">Automático · Piper local e fallbacks permitidos</option><option value="piper">Somente Piper local · português brasileiro</option><option value="fish_audio">Somente Fish Audio</option><option value="elevenlabs">Somente ElevenLabs</option><option value="browser">Voz local do navegador</option></select></label>
        {tts.provider === "auto" && <div className="grid gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 md:grid-cols-2"><label className="block text-sm font-semibold text-slate-300">Provedor remoto preferido<select className="input mt-2" value={tts.autoPreferredProvider} onChange={(event) => setTts({ ...tts, autoPreferredProvider: event.target.value })}><option value="fish_audio">Fish Audio · voz personalizada do JARVIS</option><option value="elevenlabs">ElevenLabs</option></select></label><label className="flex items-center gap-2 self-end text-sm text-slate-300"><input type="checkbox" checked={tts.allowElevenLabsFallback} onChange={(event) => setTts({ ...tts, allowElevenLabsFallback: event.target.checked })} /> Autorizar ElevenLabs como fallback automático</label><p className="text-sm text-slate-300 md:col-span-2">O Piper é tentado primeiro. Serviços remotos só são chamados quando configurados e com cota confirmada; ElevenLabs só entra no fallback quando autorizado acima.</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-4"><div><h4 className="font-semibold text-white">Identidade da voz</h4><p className="mt-1 text-sm text-slate-400">Piper usa o modelo instalado na VPS ({status.providers?.tts?.piper?.model || "pt_BR-cadu-medium"}). Esse motor permanece interno, sem endpoint público.</p><div className="mt-2 text-xs text-slate-400">Piper: {status.providers?.tts?.piper?.status === "available" ? `disponível · ${status.providers.tts.piper.latencyMs ?? "—"} ms` : "serviço local indisponível"} · Kokoro e Chatterbox aguardam avaliação de consumo antes de instalação nesta VPS.</div></div><button type="button" className="btn btn-ghost shrink-0" disabled={ttsBusy === "quotas"} onClick={() => void refreshTtsQuotas()}><RefreshCw size={16} className={ttsBusy === "quotas" ? "animate-spin" : ""} /> {ttsBusy === "quotas" ? "Consultando..." : "Consultar disponibilidade"}</button></div>
        {ttsQuotas && <div className="grid gap-3 md:grid-cols-2">{(["fish_audio", "elevenlabs"] as const).map((provider) => { const quota = ttsQuotas[provider]; const name = provider === "fish_audio" ? "Fish Audio" : "ElevenLabs"; return <div key={provider} className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm"><div className="flex justify-between gap-2"><strong className="text-white">{name}</strong><span className={quota?.status === "available" ? "text-emerald-300" : quota?.status === "exhausted" ? "text-rose-300" : "text-amber-200"}>{quota?.status === "available" ? "Disponível" : quota?.status === "exhausted" ? "Cota esgotada" : quota?.status === "not_configured" ? "Não configurado" : "Não verificado"}</span></div><p className="mt-1 text-slate-400">{quota?.remaining !== null && quota?.remaining !== undefined ? `${quota.remaining.toLocaleString("pt-BR")} caracteres restantes` : quota?.message || "Consulte para ver disponibilidade"}{quota?.limit ? ` / ${quota.limit.toLocaleString("pt-BR")}` : ""}</p></div>; })}</div>}
        <div className="space-y-3 rounded-xl border border-cyan-400/20 bg-slate-950/30 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-white">Piper · motor local PT-BR</h4><span className="text-xs text-slate-400">{status.providers?.tts?.piper?.status === "available" ? "Pronto para teste" : "Não conectado"}</span></div><p className="text-sm text-slate-400">Sem token e sem cobrança por caractere. O modelo cadu-medium ocupa cerca de 63 MB; o serviço fica limitado a 1 CPU e 512 MB de RAM.</p></div>
        <div className="space-y-3 rounded-xl border border-cyan-400/20 bg-slate-950/30 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-white">Fish Audio · voz do JARVIS</h4><span className="text-xs text-slate-400">{status.providers?.tts?.fishAudio?.configured ? "Chave e voz configuradas" : status.providers?.tts?.fishAudio?.apiKeyConfigured ? "Chave configurada" : "Não configurada"}</span></div><p className="text-sm text-slate-400">A chave fica criptografada. Ao clicar no botão, o MP3 selecionado será enviado à Fish Audio para criar um modelo privado; o arquivo não será salvo no JARVIS.</p><input className="input" type="password" autoComplete="new-password" value={tts.fishAudioApiKey} onChange={(event) => setTts({ ...tts, fishAudioApiKey: event.target.value })} placeholder={status.providers?.tts?.fishAudio?.apiKeyConfigured ? "Chave já configurada; deixe vazio para manter" : "Cole sua API key Fish Audio"} /><input className="input" value={tts.fishAudioVoiceId} onChange={(event) => setTts({ ...tts, fishAudioVoiceId: event.target.value })} aria-label="ID da voz Fish Audio" placeholder="O ID será preenchido ao clonar o MP3" /><div className="flex flex-wrap items-center gap-3"><button type="button" className="btn btn-primary" disabled={ttsBusy === "clone" || (!tts.fishAudioApiKey && !status.providers?.tts?.fishAudio?.apiKeyConfigured)} onClick={() => document.getElementById("jarvis-voice-mp3")?.click()}>{ttsBusy === "clone" ? "Criando voz privada..." : "Selecionar MP3 e clonar voz"}</button><input id="jarvis-voice-mp3" className="hidden" type="file" accept="audio/mpeg,.mp3" onChange={(event) => { void cloneJarvisVoice(event.target.files?.[0]); event.currentTarget.value = ""; }} /><span className="text-xs text-slate-500">Até 8 MB · visibilidade privada · requer chave Fish Audio</span></div></div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/30 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-white">ElevenLabs</h4><span className="text-xs text-slate-400">{status.providers?.tts?.elevenlabs?.configured ? `Chave salva · ${status.providers.tts.elevenlabs.apiKeyMasked}` : "Não configurada"}</span></div><input className="input" type="password" autoComplete="new-password" value={tts.elevenlabsApiKey} onChange={(event) => setTts({ ...tts, elevenlabsApiKey: event.target.value })} placeholder={status.providers?.tts?.elevenlabs?.configured ? "Deixe vazio para manter a chave" : "Cole sua API key ElevenLabs"} /><div className="flex gap-2"><select className="input" value={tts.elevenlabsVoiceId} onChange={(event) => setTts({ ...tts, elevenlabsVoiceId: event.target.value })}><option value="">Selecione/carregue uma voz</option>{ttsVoices.elevenlabs.map((voice) => <option key={voice.id} value={voice.id}>{voice.name}{voice.gender ? ` · ${voice.gender}` : ""}{voice.language ? ` · ${voice.language}` : ""}</option>)}</select><button type="button" className="btn btn-ghost shrink-0" disabled={ttsBusy === "voices-elevenlabs"} onClick={() => void loadTtsVoices("elevenlabs")}>{ttsBusy === "voices-elevenlabs" ? "Carregando..." : "Carregar vozes"}</button></div><input className="input" value={tts.elevenlabsVoiceId} onChange={(event) => setTts({ ...tts, elevenlabsVoiceId: event.target.value })} aria-label="ID de voz ElevenLabs" placeholder="Ou digite o voice ID" /><label className="block text-xs font-semibold text-slate-400">Modelo<input className="input mt-2" value={tts.elevenlabsModelId} onChange={(event) => setTts({ ...tts, elevenlabsModelId: event.target.value })} placeholder="eleven_multilingual_v2" /></label></div>
        </div>
        <p className="text-xs text-slate-500">Ao testar, as configurações da tela são salvas primeiro. Se nenhum motor masculino estiver disponível, o JARVIS informa a falha em vez de trocar para uma voz feminina genérica.</p>
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary"><Save size={18} /> Salvar configuração de voz</button><button type="button" className="btn btn-ghost" disabled={ttsBusy === "test" || tts.provider === "browser"} onClick={() => void testTts()}>{ttsBusy === "test" ? "Gerando áudio..." : "Testar voz selecionada"}</button></div>
      </form>
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
        <form onSubmit={connectFinance} className="glass space-y-3 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">Controle Financeiro</h3><span className="text-xs text-slate-400">{status.providers?.finance?.configured ? `Conectado · ${status.providers.finance.userEmail || "conta vinculada"}` : "Não conectado"}</span></div>
          <p className="text-sm text-slate-400">Vincule diretamente ao sistema publicado. A senha só é usada durante a autenticação; o token retornado fica criptografado no JARVIS.</p>
          <input className="input" type="url" value={finance.apiUrl} onChange={(e) => setFinance({ ...finance, apiUrl: e.target.value })} aria-label="URL do Controle Financeiro" placeholder="https://controlefinanceiro.juninnzxtec.com.br" required />
          <input className="input" type="email" autoComplete="username" value={finance.email} onChange={(e) => setFinance({ ...finance, email: e.target.value })} placeholder="E-mail usado para entrar no Controle Financeiro" required />
          {!finance.challengeToken && <input className="input" type="password" autoComplete="current-password" value={finance.password} onChange={(e) => setFinance({ ...finance, password: e.target.value })} placeholder="Senha do Controle Financeiro" required />}
          {finance.challengeToken && <input className="input" inputMode="numeric" autoComplete="one-time-code" value={finance.twoFactorCode} onChange={(e) => setFinance({ ...finance, twoFactorCode: e.target.value })} placeholder="Código 2FA" required />}
          <input className="input" value={finance.defaultAccountName} onChange={(e) => setFinance({ ...finance, defaultAccountName: e.target.value })} placeholder="Conta padrão, por exemplo PJ DO INTER" />
          {finance.challengeToken
            ? <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={financeBusy}><ShieldCheck size={18} /> Confirmar 2FA</button><button type="button" className="btn btn-ghost" onClick={() => setFinance((current) => ({ ...current, challengeToken: "", twoFactorCode: "" }))}>Reiniciar vínculo</button></div>
            : <button className="btn btn-primary" disabled={financeBusy}><ShieldCheck size={18} /> {financeBusy ? "Conectando..." : "Conectar Controle Financeiro"}</button>}
          {status.providers?.finance?.configured && <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-ghost" onClick={() => void testFinanceConnection()} disabled={financeBusy}>Testar conexão</button><button type="button" className="btn btn-ghost" onClick={() => void disconnectFinance()} disabled={financeBusy}>Desvincular</button></div>}
          <p className="text-xs text-slate-500">A conexão dá acesso aos dados financeiros da conta vinculada. O JARVIS não envia extratos à IA externa e importações continuam exigindo revisão.</p>
        </form>
      </div>
      <div className="glass rounded-2xl p-5 text-sm text-slate-300"><p className="flex items-center gap-2 font-semibold text-white"><ShieldCheck size={18} className="text-cyanx" /> Segurança e permissões</p><p className="mt-2">Somente administradores podem alterar integrações. Chaves existentes são substituídas apenas quando uma nova é informada; campos em branco mantêm as credenciais atuais.</p></div>
    </section>
  );
}
