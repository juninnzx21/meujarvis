import { useState } from "react";
import { History, Mic, ShieldCheck, Volume2 } from "lucide-react";
import { api } from "../../services/api";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export function VoicePage() {
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("pronto");
  const [history, setHistory] = useState<Array<{ text: string; reply: string; at: string }>>([]);
  const [error, setError] = useState("");
  const available = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  async function process(value: string) {
    if (!value.trim()) return;
    setError("");
    setStatus("processando");
    try {
      const res = await api.post("/voice/process", { text: value });
      const response = res.data.reply;
      setReply(response);
      setHistory((items) => [{ text: value, reply: response, at: new Date().toLocaleTimeString("pt-BR") }, ...items].slice(0, 6));
      setStatus("respondendo");
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(response));
      setTimeout(() => setStatus("pronto"), 800);
    } catch {
      setError("Nao foi possivel processar o comando de voz agora.");
      setStatus("erro");
    }
  }

  function listen() {
    if (!available) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.onstart = () => setStatus("escutando");
    recognition.onerror = () => {
      setError("Nao foi possivel capturar o audio. Verifique a permissao do navegador.");
      setStatus("erro");
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      process(transcript);
    };
    recognition.start();
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="glass rounded-2xl p-6">
        <h2 className="text-3xl font-black text-white">Modo Voz</h2>
        <p className="mt-2 text-slate-400">O microfone so e usado quando o botao e acionado. Nao ha escuta continua nesta versao.</p>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          <ShieldCheck className="mt-0.5 shrink-0 text-cyanx" size={18} />
          <p>Wake word futura "Ei Jarvis" esta apenas preparada em documentacao. Nenhum audio e capturado em segundo plano.</p>
        </div>
        <div className="my-8 grid place-items-center">
          <button onClick={listen} disabled={!available} className="grid h-40 w-40 place-items-center rounded-full bg-cyan-400/15 text-cyanx shadow-glow transition hover:scale-105 disabled:opacity-50" aria-label="Falar com JARVIS">
            <Mic size={58} />
          </button>
          <p className="mt-4 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300">{status}</p>
        </div>
        {error && <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
        {!available && <textarea className="input min-h-32" value={text} onChange={(e) => setText(e.target.value)} placeholder="Fallback textual: digite seu comando" />}
        {!available && <button onClick={() => process(text)} className="btn btn-primary mt-3">Enviar texto</button>}
      </div>
      <aside className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><Volume2 size={18} /> Transcricao</h3>
        <p className="mb-5 min-h-20 rounded-xl bg-white/5 p-3 text-slate-200">{text || "Aguardando fala..."}</p>
        <h3 className="mb-4 font-bold text-white">Resposta</h3>
        <p className="rounded-xl bg-white/5 p-3 text-slate-200">{reply || "JARVIS respondera aqui."}</p>
        <h3 className="mb-4 mt-6 flex items-center gap-2 font-bold text-white"><History size={18} /> Historico recente</h3>
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
