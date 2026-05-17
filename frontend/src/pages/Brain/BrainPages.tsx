import { FormEvent, useEffect, useState } from "react";
import { Brain, CheckCircle2, Database, FileText, MessageSquare, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type BrainStatus = {
  status: string;
  agents: number;
  tools: number;
  modes: string[];
  safety: string;
  externalAI: string;
};

type BrainAsk = {
  answer: string;
  agent: string;
  intent: string;
  confidence: number;
  usedSources: Array<{ type: string; title: string; excerpt: string }>;
  usedTools: Array<{ tool: string; status: string; message?: string }>;
  needsConfirmation: boolean;
  suggestedNextActions: string[];
};

function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">{status}</span>;
}

function BrainHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-3xl font-black text-white">{title}</h2>
        <p className="text-slate-400">{subtitle}</p>
      </div>
      <StatusBadge status="seguro" />
    </div>
  );
}

export function BrainPage() {
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [message, setMessage] = useState("Jarvis, o que voce sabe sobre mim?");
  const [mode, setMode] = useState<"quick" | "normal" | "deep">("normal");
  const [result, setResult] = useState<BrainAsk | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/brain/status").then((res) => setStatus(res.data)).catch(() => setError("Nao foi possivel carregar o Brain."));
  }, []);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/brain/ask", { message, mode, source: "chat", allowExternalAI: true, allowTools: true });
      setResult(res.data);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function feedback(kind: "good" | "bad") {
    await api.post("/brain/feedback", { message: kind === "good" ? "resposta boa" : "resposta ruim: revisar estilo e fontes", savePreference: false });
  }

  return (
    <section className="space-y-5">
      <BrainHeader title="Cerebro IA" subtitle="Super Intelligence Core com agentes, ferramentas internas, memoria, documentos e limites de seguranca." />
      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      <div className="grid gap-4 md:grid-cols-4">
        <article className="glass rounded-2xl p-5"><Brain className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Status</p><p className="font-bold text-white">{status?.status ?? "carregando"}</p></article>
        <article className="glass rounded-2xl p-5"><Sparkles className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Agentes</p><p className="font-bold text-white">{status?.agents ?? "-"}</p></article>
        <article className="glass rounded-2xl p-5"><Wrench className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Ferramentas</p><p className="font-bold text-white">{status?.tools ?? "-"}</p></article>
        <article className="glass rounded-2xl p-5"><ShieldCheck className="mb-3 text-cyanx" /><p className="text-sm text-slate-400">Seguranca</p><p className="font-bold text-white">{status?.safety ?? "-"}</p></article>
      </div>

      <form onSubmit={ask} className="glass space-y-4 rounded-2xl p-5">
        <div className="flex flex-wrap gap-2">
          {(["quick", "normal", "deep"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === item ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-200"}`}>{item}</button>
          ))}
        </div>
        <textarea className="input min-h-28" value={message} onChange={(event) => setMessage(event.target.value)} />
        <button className="btn btn-primary" disabled={loading}><MessageSquare size={18} /> {loading ? "Pensando..." : "Perguntar ao Brain"}</button>
      </form>

      {result && (
        <article className="glass space-y-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={result.agent} />
            <StatusBadge status={result.intent} />
            <StatusBadge status={`${Math.round(result.confidence * 100)}%`} />
            {result.needsConfirmation && <StatusBadge status="confirmacao obrigatoria" />}
          </div>
          <p className="whitespace-pre-wrap text-slate-100">{result.answer}</p>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => feedback("good")}><ThumbsUp size={16} /> Boa</button>
            <button className="btn btn-ghost" onClick={() => feedback("bad")}><ThumbsDown size={16} /> Corrigir</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-bold text-white">Fontes internas</h3>
              {result.usedSources.length ? result.usedSources.map((source) => <p key={`${source.type}-${source.title}`} className="mb-2 rounded-xl bg-white/5 p-3 text-sm text-slate-300">{source.title}<br /><span className="text-slate-500">{source.excerpt}</span></p>) : <p className="text-sm text-slate-500">Nenhuma fonte especifica.</p>}
            </div>
            <div>
              <h3 className="mb-2 font-bold text-white">Ferramentas</h3>
              {result.usedTools.length ? result.usedTools.map((tool) => <p key={tool.tool} className="mb-2 rounded-xl bg-white/5 p-3 text-sm text-slate-300">{tool.tool}: {tool.status}</p>) : <p className="text-sm text-slate-500">Nenhuma ferramenta usada.</p>}
            </div>
          </div>
        </article>
      )}
    </section>
  );
}

export function BrainAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => { api.get("/brain/agents").then((res) => setAgents(res.data.agents)); }, []);
  return (
    <section className="space-y-5">
      <BrainHeader title="Agentes do Brain" subtitle="Especialistas internos com dominios, ferramentas e regras de seguranca." />
      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <article key={agent.name} className="glass rounded-2xl p-5">
            <h3 className="font-black text-white">{agent.name}</h3>
            <p className="mt-2 text-sm text-slate-300">{agent.description}</p>
            <p className="mt-3 text-xs text-cyan-100">{agent.domains.join(" | ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BrainToolsPage() {
  const [tools, setTools] = useState<any[]>([]);
  useEffect(() => { api.get("/brain/tools").then((res) => setTools(res.data.tools)); }, []);
  return (
    <section className="space-y-5">
      <BrainHeader title="Ferramentas do Brain" subtitle="Consultas internas seguras e acoes que exigem confirmacao." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <article key={tool.name} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-white">{tool.name}</h3><StatusBadge status={tool.safety} /></div>
            <p className="mt-2 text-sm text-slate-400">{tool.description}</p>
            <p className="mt-3 text-xs text-cyan-100">{tool.category}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BrainMemoryPage() {
  return (
    <section className="space-y-5">
      <BrainHeader title="Memoria Contextual" subtitle="O Brain usa memorias relevantes, documentos e feedback sem salvar segredos." />
      <div className="glass rounded-2xl p-5 text-slate-300">
        <Database className="mb-3 text-cyanx" />
        <p>Use comandos como "lembre que...", "o que voce sabe sobre mim?" e "quais sao minhas prioridades?". Dados sensiveis devem ficar fora da memoria comum.</p>
      </div>
    </section>
  );
}

export function BrainFeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [message, setMessage] = useState("Prefiro respostas diretas com proximo passo exato.");
  useEffect(() => { api.get("/brain/feedback").then((res) => setFeedback(res.data.feedback ?? [])); }, []);
  async function save() {
    await api.post("/brain/feedback", { message, savePreference: true });
    const res = await api.get("/brain/feedback");
    setFeedback(res.data.feedback ?? []);
  }
  return (
    <section className="space-y-5">
      <BrainHeader title="Feedback e Aprendizado" subtitle="Registre correcoes e preferencias sem armazenar segredos." />
      <div className="glass space-y-3 rounded-2xl p-5">
        <textarea className="input min-h-24" value={message} onChange={(event) => setMessage(event.target.value)} />
        <button className="btn btn-primary" onClick={save}><CheckCircle2 size={18} /> Salvar preferencia segura</button>
      </div>
      <div className="grid gap-3">
        {feedback.map((item) => <article key={item.id} className="glass rounded-2xl p-4 text-sm text-slate-300"><FileText size={16} className="mb-2 text-cyanx" />{item.message}</article>)}
      </div>
    </section>
  );
}
