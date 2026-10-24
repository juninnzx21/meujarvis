import { FormEvent, useState } from "react";
import { AppWindow, FileEdit, FolderOpen, HardDrive, Info, Laptop, Mic, ShieldCheck, Trash2 } from "lucide-react";
import { friendlyError } from "../../services/api";
import { isSpeechRecognitionSupported, startListening, stopListening } from "../../services/speechRecognitionService";
import { loadVoiceSettings, speakJarvis, stopSpeaking } from "../../services/textToSpeechService";

const examples = [
  { icon: AppWindow, text: "Jarvis, abra a calculadora" },
  { icon: Laptop, text: "Jarvis, abra o aplicativo Steam" },
  { icon: FolderOpen, text: "Jarvis, abra a pasta Downloads" },
  { icon: HardDrive, text: "Jarvis, crie uma pasta Relatorios em Documentos" },
  { icon: FileEdit, text: "Jarvis, edite arquivo notas.txt em Documentos com conteúdo Texto novo" },
  { icon: Trash2, text: "Jarvis, exclua arquivo notas.txt em Documentos" }
];

export function ComputerPage() {
  const desktop = Boolean(window.jarvisDesktop?.isDesktop);
  const [command, setCommand] = useState("");
  const [result, setResult] = useState("Atalho do JARVIS: Ctrl+Shift+J");
  const [listening, setListening] = useState(false);

  async function run(value: string) {
    if (!window.jarvisDesktop) {
      setResult("Instale o companion JARVIS Desktop para executar ações locais.");
      return;
    }
    const phrase = value.trim();
    if (!phrase) return;
    setCommand(phrase);
    setListening(false);
    stopListening();
    try {
      const response = await window.jarvisDesktop.executeLocalCommand(phrase);
      const message = response.handled ? response.error || response.message || "Ação concluída." : "Esse pedido não corresponde a uma ação local liberada. Faça a pergunta no Chat para obter uma resposta da IA.";
      setResult(message);
      await speakJarvis(message);
    } catch (error) {
      setResult(friendlyError(error));
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(command);
  }

  function startVoice() {
    if (!isSpeechRecognitionSupported()) {
      setResult("O reconhecimento de voz não está disponível. Atualize o WebView2/Windows ou use o campo de texto.");
      return;
    }
    stopSpeaking();
    setResult("Estou ouvindo. Fale uma ação local compatível.");
    setListening(true);
    const started = startListening({
      lang: loadVoiceSettings().lang || "pt-BR",
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
      onTranscript: (transcript) => { setCommand(transcript); void run(transcript); },
      onError: (message) => { setListening(false); setResult(/permiss[aã]o|not-allowed/i.test(message) ? "O microfone precisa de autorização: clique no ícone do JARVIS na bandeja do Windows, escolha 'Autorizar microfone neste uso do JARVIS' e tente novamente." : message); }
    });
    if (!started) setListening(false);
  }

  return (
    <section className="space-y-5">
      <header className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">COMPANION PARA WINDOWS</p><h1 className="mt-2 text-3xl font-black text-white">Controle do computador</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Use voz ou texto para abrir aplicativos e pastas e gerenciar arquivos pessoais dentro de limites claros.</p></div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${desktop ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>{desktop ? "Companion conectado" : "Abra pelo JARVIS Desktop"}</span>
      </header>

      {!desktop && <div className="glass flex gap-3 rounded-2xl p-4 text-sm text-amber-100"><Info className="shrink-0" size={18} /><p>Esta tela está no navegador comum, que não tem permissão para controlar o Windows. Instale e abra o JARVIS Desktop no PC; então entre na mesma conta para habilitar estas ações.</p></div>}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <article className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Mic size={19} className="text-cyan-300" /> Fale com o JARVIS</h2>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className="input" aria-label="Comando local" placeholder="Ex.: Jarvis, abra a pasta Downloads" value={command} onChange={(event) => setCommand(event.target.value)} disabled={!desktop} />
            <button className="btn btn-primary" type="submit" disabled={!desktop || !command.trim()}>Executar</button>
          </form>
          <button className="btn btn-ghost mt-3 w-full" type="button" onClick={startVoice} disabled={!desktop || listening}>{listening ? "Ouvindo…" : "Ativar microfone e falar"}</button>
          <p role="status" aria-live="polite" className="mt-4 min-h-12 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">{result}</p>
        </article>

        <article className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><ShieldCheck size={19} className="text-cyan-300" /> Permissões e limites</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
            <li>Atalho global <strong>Ctrl+Shift+J</strong> abre o assistente. Não existe escuta permanente.</li>
            <li>O microfone exige autorização temporária pelo menu do JARVIS na bandeja do Windows e depois o botão de voz.</li>
            <li>Pastas permitidas: Documentos, Downloads, Área de Trabalho, Imagens, Músicas e Vídeos.</li>
            <li>Exclusões vão para a Lixeira e mostram confirmação nativa. O companion não apaga pastas nem executa comandos de terminal.</li>
            <li>Arquivos novos são texto simples e não substituem um arquivo existente.</li>
          </ul>
        </article>
      </div>

      <article className="glass rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white">Comandos disponíveis</h2>
        <p className="mt-1 text-sm text-slate-400">Apps do menu Iniciar precisam ser pedidos pelo nome exato do atalho. Comandos fora desta lista não são executados no PC.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {examples.map(({ icon: Icon, text }) => <button key={text} type="button" disabled={!desktop} onClick={() => { setCommand(text); void run(text); }} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/35 p-3 text-left text-sm text-slate-200 hover:border-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50"><Icon size={18} className="shrink-0 text-cyan-300" />{text}</button>)}
        </div>
      </article>
    </section>
  );
}
