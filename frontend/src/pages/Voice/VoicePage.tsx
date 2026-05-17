import { FormEvent, useEffect, useState } from "react";
import { History, Mic, ShieldCheck, SlidersHorizontal, Square, Volume2, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { api, friendlyError } from "../../services/api";
import { isSpeechRecognitionSupported, onError, onTranscript, startListening, stopListening } from "../../services/speechRecognitionService";
import { loadVoiceSettings, speakJarvis, stopSpeaking, testVoice } from "../../services/textToSpeechService";

type VoiceHistoryItem = { text: string; reply: string; at: string };

export function VoicePage() {
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("pronto");
  const [history, setHistory] = useState<VoiceHistoryItem[]>([]);
  const [error, setError] = useState("");
  const [conversationMode, setConversationMode] = useState(false);
  const available = isSpeechRecognitionSupported();
  const voiceSettings = loadVoiceSettings();

  useEffect(() => {
    onTranscript((transcript) => {
      setText(transcript);
      void process(transcript);
    });
    onError((message) => {
      setError(message);
      setStatus("erro");
    });
  }, []);

  async function process(value: string) {
    const command = value.trim();
    if (!command) return;
    setError("");
    setStatus("processando");
    try {
      const res = await api.post("/voice/process", { text: command });
      const response = res.data.reply;
      setReply(response);
      setHistory((items) => [{ text: command, reply: response, at: new Date().toLocaleTimeString("pt-BR") }, ...items].slice(0, 8));
      setStatus("falando");
      speakJarvis(response);
      window.setTimeout(() => setStatus(conversationMode ? "conversa pronta" : "pronto"), 900);
    } catch (err) {
      setError(friendlyError(err) || "Nao foi possivel processar o comando de voz agora.");
      setStatus("erro");
    }
  }

  function listen() {
    setError("");
    if (!available) {
      setError("Reconhecimento de voz indisponivel neste navegador. Use o campo de texto.");
      return;
    }
    startListening({
      lang: voiceSettings.lang,
      onStart: () => setStatus("ouvindo"),
      onEnd: () => setStatus((current) => current === "ouvindo" ? "pronto" : current)
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void process(text);
  }

  function stopAll() {
    stopListening();
    stopSpeaking();
    setStatus("parado");
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">JARVIS BR Premium</p>
            <h2 className="text-3xl font-black text-white">Modo Voz</h2>
            <p className="mt-2 text-slate-400">Voz original do projeto: calma, grave, tecnologica e executiva. Nao e clone de ator, filme ou personagem.</p>
          </div>
          <Link className="btn btn-ghost" to="/settings/voice"><SlidersHorizontal size={18} /> Ajustar voz</Link>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          <ShieldCheck className="mt-0.5 shrink-0 text-cyanx" size={18} />
          <p>Privacidade: o microfone so liga quando voce clica. Nao ha escuta continua oculta e audio bruto nao e salvo em logs.</p>
        </div>
        <div className="my-8 grid place-items-center">
          <button onClick={listen} disabled={!available} className="voice-orb grid h-44 w-44 place-items-center rounded-full bg-cyan-400/15 text-cyanx shadow-glow transition hover:scale-105 disabled:opacity-50" aria-label="Falar com JARVIS">
            <Mic size={62} />
          </button>
          <div className="mt-5 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300">
            <Waves size={16} className={status === "ouvindo" || status === "falando" ? "animate-pulse text-cyan-200" : "text-slate-500"} />
            {status}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={listen} disabled={!available}><Mic size={18} /> Falar com JARVIS</button>
          <button type="button" className="btn btn-ghost" onClick={() => testVoice()}><Volume2 size={18} /> Testar voz</button>
          <button type="button" className="btn btn-ghost" onClick={stopAll}><Square size={18} /> Parar fala</button>
          <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 text-sm text-slate-200">
            <input type="checkbox" checked={conversationMode} onChange={(event) => setConversationMode(event.target.checked)} />
            Modo conversa com consentimento
          </label>
        </div>
        {error && <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
        <form onSubmit={submit} className="mt-5 space-y-3">
          <textarea className="input min-h-28" value={text} onChange={(event) => setText(event.target.value)} placeholder="Fallback textual: digite seu comando para o JARVIS" />
          <button className="btn btn-primary">Enviar texto</button>
        </form>
      </div>
      <aside className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><Volume2 size={18} /> Transcricao</h3>
        <p className="mb-5 min-h-20 rounded-xl bg-white/5 p-3 text-slate-200">{text || "Aguardando fala..."}</p>
        <h3 className="mb-4 font-bold text-white">Resposta falada</h3>
        <p className="rounded-xl bg-white/5 p-3 text-slate-200">{reply || "JARVIS respondera aqui."}</p>
        <h3 className="mb-4 mt-6 flex items-center gap-2 font-bold text-white"><History size={18} /> Historico de voz</h3>
        <div className="space-y-3">
          {history.length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Nenhum comando de voz nesta sessao.</p>}
          {history.map((item) => (
            <div key={`${item.at}-${item.text}`} className="rounded-xl bg-white/5 p-3 text-sm">
              <p className="text-cyan-100">{item.at} - {item.text}</p>
              <p className="mt-1 text-slate-300">{item.reply}</p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
