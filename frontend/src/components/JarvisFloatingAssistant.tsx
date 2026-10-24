import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Maximize2, Mic, MicOff, Minimize2, Send, X } from "lucide-react";
import { api, friendlyError } from "../services/api";
import { isSpeechRecognitionSupported, startListening, stopListening } from "../services/speechRecognitionService";
import { loadVoiceSettings, speakJarvis, stopSpeaking } from "../services/textToSpeechService";

type AssistantState = "pronto" | "ouvindo" | "pensando" | "falando" | "pausado" | "erro";

function HolographicFace({ state }: { state: AssistantState }) {
  return (
    <div className={`jarvis-holo-face jarvis-holo-face--${state}`} aria-hidden="true">
      <span className="jarvis-holo-face__ring jarvis-holo-face__ring--outer" />
      <span className="jarvis-holo-face__ring jarvis-holo-face__ring--inner" />
      <svg viewBox="0 0 160 180" className="jarvis-holo-face__svg" fill="none">
        <path className="jarvis-holo-face__outline" d="M80 14 119 35 137 72 129 125 103 157 80 168 57 157 31 125 23 72 41 35 80 14Z" />
        <path className="jarvis-holo-face__detail" d="M42 56 64 47 80 52 96 47 118 56M39 73 59 67 71 73M121 73 101 67 89 73M80 53v67M48 113l12 21 20 9 20-9 12-21M62 109h36" />
        <path className="jarvis-holo-face__eye" d="m49 82 20-5M111 82l-20-5" />
        <path className="jarvis-holo-face__mouth" d="M64 132c9 5 23 5 32 0" />
        <circle className="jarvis-holo-face__node" cx="80" cy="14" r="3" />
        <circle className="jarvis-holo-face__node" cx="23" cy="72" r="3" />
        <circle className="jarvis-holo-face__node" cx="137" cy="72" r="3" />
      </svg>
      <span className="jarvis-holo-face__scan" />
    </div>
  );
}

export function JarvisFloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [voiceStarting, setVoiceStarting] = useState(false);
  const [conversationOn, setConversationOn] = useState(false);
  const [state, setState] = useState<AssistantState>("pronto");
  const [text, setText] = useState("");
  const [reply, setReply] = useState("Estou pronto. Toque no microfone para falar comigo.");
  const [error, setError] = useState("");
  const conversationId = useRef("");
  const conversationOnRef = useRef(false);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => () => {
    conversationOnRef.current = false;
    stopListening();
    stopSpeaking();
  }, []);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (!document.hidden || !conversationOnRef.current) return;
      conversationOnRef.current = false;
      setConversationOn(false);
      stopListening();
      stopSpeaking();
      setState("pausado");
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      if (!document.fullscreenElement) setImmersive(false);
    };
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && immersive && !document.fullscreenElement) setImmersive(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("keydown", exitOnEscape);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("keydown", exitOnEscape);
    };
  }, [immersive]);

  function listen(): boolean {
    if (!supported) {
      setError("Este navegador não oferece reconhecimento de fala. Você ainda pode digitar sua mensagem.");
      setState("erro");
      return false;
    }
    setError("");
    const started = startListening({
      lang: loadVoiceSettings().lang || "pt-BR",
      onStart: () => setState("ouvindo"),
      onEnd: () => setState((current) => current === "ouvindo" ? "pronto" : current),
      onTranscript: (transcript) => { void send(transcript); },
      onError: (message) => {
        setError(window.jarvisDesktop && /permiss[aã]o|not-allowed/i.test(message)
          ? "O microfone foi bloqueado pelo Windows ou navegador. Permita o acesso em Configurações > Privacidade e segurança > Microfone e tente novamente."
          : message);
        setState("erro");
      }
    });
    if (!started) setState("erro");
    return started;
  }

  async function send(value: string) {
    const command = value.trim();
    if (!command) return;
    stopListening();
    setText(command);
    setError("");
    setState("pensando");
    try {
      const localAction = await window.jarvisDesktop?.executeLocalCommand(command);
      if (localAction?.handled) {
        const answer = localAction.error || localAction.message || "Ação local processada.";
        setReply(answer);
        setText("");
        setState("falando");
        const spoken = await speakJarvis(answer, undefined, { onEnd: () => setState("pronto") });
        if (!spoken) setState("pronto");
        return;
      }
      const response = await api.post("/voice/process", {
        text: command,
        ...(conversationId.current ? { conversationId: conversationId.current } : {})
      });
      conversationId.current = response.data.conversationId || conversationId.current;
      const answer = response.data.reply || "Comando processado.";
      setReply(answer);
      setText("");
      setState("falando");
      const finish = () => {
        if (conversationOnRef.current && !document.hidden) {
          window.setTimeout(() => { if (conversationOnRef.current && !document.hidden) listen(); }, 350);
        } else {
          setState("pronto");
        }
      };
      const spoken = await speakJarvis(answer, undefined, { onEnd: finish });
      if (!spoken) finish();
    } catch (cause) {
      setError(friendlyError(cause));
      setState("erro");
      if (conversationOnRef.current && !document.hidden) {
        window.setTimeout(() => { if (conversationOnRef.current && !document.hidden) listen(); }, 1200);
      }
    }
  }

  async function toggleConversation() {
    if (voiceStarting) return;
    const next = !conversationOnRef.current;
    if (next) {
      setVoiceStarting(true);
      setOpen(true);
      try {
        if (window.jarvisDesktop && !(await window.jarvisDesktop.authorizeMicrophone())) {
          throw new Error("O companion não autorizou o microfone. Atualize o JARVIS Desktop e tente novamente.");
        }
        conversationOnRef.current = true;
        setConversationOn(true);
        setReply("Modo conversa ativado. Vou ouvir enquanto esta janela estiver aberta; toque em Pausar para encerrar.");
        if (!listen()) {
          conversationOnRef.current = false;
          setConversationOn(false);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível autorizar o microfone.");
        setState("erro");
      } finally {
        setVoiceStarting(false);
      }
    } else {
      conversationOnRef.current = false;
      setConversationOn(false);
      stopListening();
      stopSpeaking();
      setState("pausado");
    }
  }

  async function toggleImmersive() {
    if (immersive) {
      if (document.fullscreenElement && document.exitFullscreen) {
        try { await document.exitFullscreen(); } catch { /* CSS fallback continua disponível */ }
      }
      setImmersive(false);
      return;
    }
    setOpen(true);
    setImmersive(true);
    if (document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); } catch { /* ativa modo imersivo em janela */ }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(text);
  }

  function close() {
    conversationOnRef.current = false;
    setConversationOn(false);
    stopListening();
    stopSpeaking();
    setState("pronto");
    setOpen(false);
    if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => undefined);
    setImmersive(false);
  }

  const statusLabel: Record<AssistantState, string> = {
    pronto: "Pronto para conversar",
    ouvindo: "Estou ouvindo",
    pensando: "Analisando sua solicitação",
    falando: "JARVIS está respondendo",
    pausado: "Microfone pausado",
    erro: "Verifique o microfone ou a conexão"
  };

  return (
    <aside className={`jarvis-float-root${immersive ? " jarvis-float-root--immersive" : ""}`} aria-label="Assistente flutuante JARVIS">
      {open && <section className={`jarvis-float-panel glass${immersive ? " jarvis-float-panel--immersive" : ""}`} aria-label="Conversa rápida com JARVIS">
        <header className="jarvis-float-header">
          <div><span className="jarvis-float-eyebrow">{immersive ? "INTERFACE IMERSIVA · SISTEMA ONLINE" : "ASSISTENTE PESSOAL"}</span><h2>JARVIS</h2></div>
          <div className="jarvis-float-header-actions">
            <button type="button" className="jarvis-float-icon-button" onClick={() => void toggleImmersive()} aria-label={immersive ? "Sair da tela cheia" : "Abrir em tela cheia"} title={immersive ? "Sair da tela cheia" : "Modo imersivo em tela cheia"}>{immersive ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
            <button type="button" className="jarvis-float-icon-button" onClick={close} aria-label="Fechar assistente"><X size={18} /></button>
          </div>
        </header>
        {immersive && <div className="jarvis-immersive-hud" aria-hidden="true"><span>J·CORE <b>VOICE LINK</b></span><span>ÁUDIO <b>{conversationOn ? "ATIVO" : "EM ESPERA"}</b></span><span>IDIOMA <b>PT-BR</b></span></div>}
        <div className="jarvis-float-visual"><HolographicFace state={state} /><p className="jarvis-float-state"><span className={`jarvis-state-dot jarvis-state-dot--${state}`} />{statusLabel[state]}</p></div>
        <div className="jarvis-float-reply" aria-live="polite">{error || reply}</div>
        <form className="jarvis-float-compose" onSubmit={submit}>
          <input value={text} onChange={(event) => setText(event.target.value)} aria-label="Mensagem para JARVIS" placeholder="Pergunte algo ao JARVIS…" />
          <button type="submit" aria-label="Enviar mensagem" disabled={!text.trim()}><Send size={17} /></button>
        </form>
        <div className="jarvis-float-actions">
          <button type="button" className={conversationOn ? "jarvis-float-action jarvis-float-action--active" : "jarvis-float-action"} onClick={() => void toggleConversation()} disabled={voiceStarting}>
            {conversationOn ? <MicOff size={16} /> : <Mic size={16} />}{voiceStarting ? "Autorizando microfone…" : conversationOn ? "Pausar microfone" : "Ativar conversa por voz"}
          </button>
        </div>
        <p className="jarvis-float-privacy">{window.jarvisDesktop ? "O microfone é liberado quando você toca neste botão. A conversa para ao pausar, fechar ou ocultar a janela." : "O microfone só fica ativo no modo conversa que você iniciou. Feche ou pause para desligá-lo."}{immersive && " · Pressione Esc para sair da tela cheia."}</p>
      </section>}
      {!immersive && <button type="button" onClick={() => open ? close() : setOpen(true)} className={`jarvis-float-launcher ${state !== "pronto" && state !== "pausado" ? "jarvis-float-launcher--active" : ""}`} aria-label={open ? "Fechar e pausar JARVIS" : "Abrir assistente JARVIS"} aria-expanded={open}>
        {open ? <ChevronDown size={24} /> : <><HolographicFace state={state} /><span className="jarvis-float-launcher__label"><Bot size={14} /> JARVIS</span></>}
      </button>}
    </aside>
  );
}
