import { FormEvent, useEffect, useState } from "react";
import { Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "../../services/api";
import type { Message } from "../../types";

type BrainMeta = {
  agent?: string;
  intent?: string;
  confidence?: number;
  needsConfirmation?: boolean;
};

export function ChatPage() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Array<Message & { metadata?: BrainMeta }>>([]);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"quick" | "normal" | "deep">("normal");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/chat/conversations").then((res) => {
      const first = res.data.conversations[0];
      if (first) {
        setConversationId(first.id);
        api.get(`/chat/conversations/${first.id}`).then((detail) => setMessages(detail.data.conversation.messages));
      }
    }).catch(() => undefined);
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    const optimistic: Message = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setLoading(true);
    const text = content;
    setContent("");
    try {
      const res = await api.post("/chat/send", { content: text, conversationId, mode });
      setConversationId(res.data.conversation.id);
      setMessages((current) => [...current, res.data.assistantMessage]);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(kind: "good" | "bad") {
    await api.post("/brain/feedback", {
      message: kind === "good" ? "resposta boa no chat" : "resposta ruim no chat; revisar clareza, contexto e proximo passo",
      savePreference: false
    });
  }

  return (
    <section className="grid h-[calc(100vh-8rem)] gap-4 lg:grid-cols-[1fr_320px]">
      <div className="glass flex min-h-0 flex-col rounded-2xl">
        <div className="border-b border-white/10 p-5"><h2 className="text-2xl font-black text-white">Chat com JARVIS</h2></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message) => (
            <div key={message.id} className={`max-w-3xl rounded-2xl p-4 ${message.role === "user" ? "ml-auto bg-cyan-400/15 text-cyan-50" : "bg-white/5 text-slate-100"}`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" && message.metadata?.agent && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-white/5 px-2 py-1">{message.metadata.agent}</span>
                  <span className="rounded-full bg-white/5 px-2 py-1">{message.metadata.intent}</span>
                  {message.metadata.needsConfirmation && <span className="rounded-full bg-yellow-400/10 px-2 py-1 text-yellow-100">confirmacao</span>}
                  <button type="button" onClick={() => sendFeedback("good")} className="rounded-full bg-white/5 px-2 py-1 hover:bg-white/10"><ThumbsUp size={12} /></button>
                  <button type="button" onClick={() => sendFeedback("bad")} className="rounded-full bg-white/5 px-2 py-1 hover:bg-white/10"><ThumbsDown size={12} /></button>
                </div>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-cyan-200">JARVIS está processando...</p>}
        </div>
        <form onSubmit={send} className="flex gap-3 border-t border-white/10 p-4">
          <select className="input max-w-32" value={mode} onChange={(event) => setMode(event.target.value as "quick" | "normal" | "deep")}>
            <option value="quick">Quick</option>
            <option value="normal">Normal</option>
            <option value="deep">Deep</option>
          </select>
          <input className="input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Digite um comando ou mensagem..." />
          <button className="btn btn-primary"><Send size={18} /></button>
        </form>
      </div>
      <aside className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-white">Comandos rápidos</h3>
        {["lembre que prefiro luz baixa à noite", "crie uma tarefa para revisar automações", "status do sistema", "liste minhas tarefas"].map((text) => (
          <button key={text} onClick={() => setContent(text)} className="mb-2 w-full rounded-xl bg-white/5 p-3 text-left text-sm text-slate-300 hover:bg-white/10">{text}</button>
        ))}
      </aside>
    </section>
  );
}
