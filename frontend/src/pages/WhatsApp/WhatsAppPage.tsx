import { FormEvent, useEffect, useState } from "react";
import { FlaskConical, Send, ShieldCheck } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/api";

export function WhatsAppPage() {
  const [status, setStatus] = useState<any>({});
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function load() {
    const res = await api.get("/whatsapp/status");
    setStatus(res.data);
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function testConnection() {
    const res = await api.post("/whatsapp/test-connection");
    setMessage(res.data.message || (res.data.status === "success" ? "Evolution API respondeu com sucesso." : res.data.status));
    await load();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      setMessage("Informe um numero com DDI, somente digitos, entre 10 e 15 caracteres.");
      return;
    }
    if (!confirmed) {
      setMessage("Confirme explicitamente antes de enviar uma mensagem de teste.");
      return;
    }
    const res = await api.post("/whatsapp/send", { phone: cleanPhone, content, confirmed: true });
    setMessage(res.data.message || "Mensagem processada.");
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <form onSubmit={send} className="glass space-y-4 rounded-2xl p-5">
        <h2 className="text-3xl font-black text-white">WhatsApp</h2>
        <p className="text-sm text-slate-400">Envio individual de teste via Evolution API, sempre com confirmacao.</p>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numero com DDI. Ex: 5511999999999" />
        <textarea className="input min-h-32" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Mensagem de teste" />
        <label className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Confirmo que este e um envio individual de teste autorizado.
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={testConnection} className="btn btn-ghost"><FlaskConical size={18} /> Testar conexao</button>
          <button className="btn btn-primary"><Send size={18} /> Enviar teste</button>
        </div>
        {message && <p className="rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </form>
      <aside className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-white">Status</h3>
        <StatusPill status={status.status} />
        <div className="mt-4 flex items-start gap-2 text-sm text-slate-400">
          <ShieldCheck size={18} className="shrink-0 text-cyanx" />
          <p>Auto reply padrao: {String(status.autoReply)}. Credenciais da Evolution API permanecem somente no backend.</p>
        </div>
      </aside>
    </section>
  );
}
