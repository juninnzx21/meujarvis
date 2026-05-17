import { FormEvent, useEffect, useState } from "react";
import { Activity, Bot, FileText, Mic, Send, Square, WalletCards, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { api, friendlyError } from "../../services/api";
import { isSpeechRecognitionSupported, onError, onTranscript, startListening, stopListening } from "../../services/speechRecognitionService";
import { speakJarvis, stopSpeaking } from "../../services/textToSpeechService";

const shortcuts = [
  { to: "/tasks", label: "Tarefas", icon: Activity },
  { to: "/finance", label: "Financeiro", icon: WalletCards },
  { to: "/whatsapp", label: "WhatsApp", icon: Send },
  { to: "/n8n", label: "n8n", icon: Workflow },
  { to: "/documents", label: "Documentos", icon: FileText },
  { to: "/status", label: "Status", icon: Activity }
];

export function JarvisModePage() {
  const [input, setInput] = useState("status do sistema");
  const [reply, setReply] = useState("Central de comando pronta.");
  const [status, setStatus] = useState("online");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Record<string, any>>({});
  const speechSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    api.get("/health/full").then((res) => setHealth(res.data)).catch(() => setHealth({ app: "unknown" }));
    onTranscript((transcript) => {
      setInput(transcript);
      void send(transcript);
    });
    onError((message) => {
      setError(message);
      setStatus("erro");
    });
  }, []);

  async function send(value = input) {
    const command = value.trim();
    if (!command) return;
    setStatus("processando");
    setError("");
    try {
      const res = await api.post("/voice/process", { text: command });
      const nextReply = res.data.reply || "Comando processado.";
      setReply(nextReply);
      speakJarvis(nextReply);
      setStatus("falando");
      window.setTimeout(() => setStatus("online"), 900);
    } catch (err) {
      setError(friendlyError(err));
      setStatus("erro");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function listen() {
    setError("");
    startListening({ lang: "pt-BR", onStart: () => setStatus("ouvindo"), onEnd: () => setStatus("online") });
  }

  function stopAll() {
    stopListening();
    stopSpeaking();
    setStatus("parado");
  }

  return (
    <section className="space-y-5">
      <div className="glass overflow-hidden rounded-3xl p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Central de comando</p>
            <h2 className="mt-2 text-4xl font-black text-white">JARVIS BR Premium</h2>
            <p className="mt-3 max-w-2xl text-slate-400">Experiencia de voz original do projeto, com resposta falada, chat curto e atalhos operacionais. O microfone exige clique explicito.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn btn-primary" disabled={!speechSupported} onClick={listen}><Mic size={18} /> Falar</button>
              <button className="btn btn-ghost" onClick={stopAll}><Square size={18} /> Parar</button>
              <Link className="btn btn-ghost" to="/settings/voice">Ajustar voz</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
            <Bot className="mb-4 text-cyanx" size={34} />
            <p className="text-sm text-slate-400">Status</p>
            <p className="text-2xl font-black text-white">{status}</p>
            <p className="mt-3 text-sm text-slate-300">App: {health.app || "carregando"} | Banco: {health.database || "-"}</p>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="glass flex flex-col gap-3 rounded-2xl p-4 md:flex-row">
        <input className="input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Diga ou digite um comando curto" />
        <button className="btn btn-primary"><Send size={18} /> Enviar</button>
      </form>
      {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
      <div className="glass rounded-2xl p-5">
        <p className="text-sm text-slate-400">Resposta</p>
        <p className="mt-2 text-lg text-white">{reply}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {shortcuts.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="min-h-24 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-slate-100 transition hover:border-cyan-300/60">
            <Icon className="mb-2 text-cyanx" size={20} /> {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
