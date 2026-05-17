import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, FileText, MessageSquare, Mic, Send, ShieldCheck, WalletCards } from "lucide-react";
import { api, friendlyError } from "../../services/api";
import { isSpeechRecognitionSupported, onError, onTranscript, startListening } from "../../services/speechRecognitionService";
import { speakJarvis } from "../../services/textToSpeechService";

type HistoryItem = {
  text: string;
  reply: string;
  at: string;
};

const quickActions = [
  { label: "Status do sistema", text: "status do sistema" },
  { label: "Resumo do dia", text: "gerar resumo do dia" },
  { label: "Tarefas de hoje", text: "quais tarefas tenho hoje?" },
  { label: "Financeiro do mes", text: "resumo financeiro do mes" },
  { label: "Importar extrato", text: "quero importar um extrato do Inter" },
  { label: "Testar n8n", text: "testar n8n" },
  { label: "Casa inteligente", text: "status da casa" }
];

export function MobileAssistantPage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("pronto");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [whatsappLink, setWhatsappLink] = useState("/whatsapp");
  const available = isSpeechRecognitionSupported();

  useEffect(() => {
    api.get("/whatsapp/status")
      .then((res) => {
        const instance = String(res.data.instance || "").replace(/\D/g, "");
        if (instance.length >= 10) setWhatsappLink(`https://wa.me/${instance}`);
      })
      .catch(() => setWhatsappLink("/whatsapp"));
    onTranscript((transcript) => {
      setText(transcript);
      void sendCommand(transcript);
    });
    onError((message) => {
      setError(message);
      setStatus("erro");
    });
  }, []);

  async function sendCommand(value: string) {
    const command = value.trim();
    if (!command) return;
    setStatus("processando");
    setError("");
    try {
      const response = await api.post("/chat/send", { content: command });
      const reply = response.data.assistantMessage?.content || response.data.reply || "Comando processado.";
      setHistory((items) => [{ text: command, reply, at: new Date().toLocaleTimeString("pt-BR") }, ...items].slice(0, 5));
      setText("");
      setStatus("pronto");
      speakJarvis(reply);
    } catch (err) {
      setError(friendlyError(err));
      setStatus("erro");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendCommand(text);
  }

  function listen() {
    if (!available) {
      setError("Reconhecimento de voz indisponivel neste navegador. Use o campo de texto.");
      return;
    }
    startListening({ lang: "pt-BR", onStart: () => setStatus("escutando"), onEnd: () => setStatus("pronto") });
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="glass rounded-3xl p-5 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx shadow-glow">
          <Mic size={34} />
        </div>
        <h2 className="mt-4 text-3xl font-black text-white">JARVIS Mobile</h2>
        <p className="mt-2 text-sm text-slate-400">Tela focada para usar o JARVIS no celular com a voz original JARVIS BR Premium.</p>
        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-left text-sm text-cyan-50">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 shrink-0 text-cyanx" size={18} />
            <p>O microfone so e ativado quando voce toca no botao. Nao existe escuta continua oculta.</p>
          </div>
        </div>
        <button onClick={listen} className="mt-6 grid h-36 w-36 place-items-center rounded-full bg-cyan-400/15 text-cyanx shadow-glow transition hover:scale-105 active:scale-95" aria-label="Falar com JARVIS">
          <Mic size={58} />
        </button>
        <p className="mt-3 inline-flex rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300">{status}</p>
      </div>

      <form onSubmit={submit} className="glass rounded-2xl p-4">
        <label className="text-sm font-semibold text-slate-300" htmlFor="mobile-command">Comando rapido</label>
        <div className="mt-2 flex gap-2">
          <input id="mobile-command" className="input min-h-12" value={text} onChange={(event) => setText(event.target.value)} placeholder="Digite ou fale com o JARVIS..." />
          <button className="btn btn-primary min-h-12 px-4" aria-label="Enviar comando"><Send size={18} /></button>
        </div>
        {error && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickActions.map((action) => (
          <button key={action.label} onClick={() => void sendCommand(action.text)} className="min-h-20 rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-sm font-bold text-slate-100 transition hover:bg-white/10">
            {action.label}
          </button>
        ))}
        <Link to="/finance/import" className="min-h-20 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"><FileText className="mb-1 text-cyanx" size={18} /> Importar extrato</Link>
        <Link to="/documents" className="min-h-20 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"><FileText className="mb-1 text-cyanx" size={18} /> Documentos</Link>
        <Link to="/n8n" className="min-h-20 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"><FileText className="mb-1 text-cyanx" size={18} /> n8n</Link>
        <a href={whatsappLink} className="min-h-20 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"><MessageSquare className="mb-1 text-cyanx" size={18} /> Abrir WhatsApp</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/tasks" className="glass rounded-2xl p-4 text-sm font-bold text-slate-100">Tarefas</Link>
        <Link to="/finance" className="glass rounded-2xl p-4 text-sm font-bold text-slate-100"><WalletCards className="mb-1 text-cyanx" size={18} /> Financeiro</Link>
        <Link to="/notifications" className="glass rounded-2xl p-4 text-sm font-bold text-slate-100"><Bell className="mb-1 text-cyanx" size={18} /> Notificacoes</Link>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="font-bold text-white">Historico curto</h3>
        <div className="mt-3 space-y-3">
          {history.length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">Nenhum comando nesta sessao.</p>}
          {history.map((item) => (
            <div key={`${item.at}-${item.text}`} className="rounded-xl bg-white/5 p-3 text-sm">
              <p className="font-semibold text-cyan-100">{item.at} - {item.text}</p>
              <p className="mt-1 text-slate-300">{item.reply}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
