import { useEffect, useState } from "react";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

export function IntegrationWizardPage() {
  const [wizard, setWizard] = useState<any>({ steps: [] });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get("/integrations/setup-wizard");
    setWizard(res.data);
  }

  useEffect(() => { load().catch(() => setMessage("Nao foi possivel carregar o wizard.")); }, []);

  async function test(provider: string) {
    try {
      const res = await api.post(`/integrations/test/${provider}`);
      setMessage(res.data.message || `${provider}: ${res.data.status || "ok"}`);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-black text-white">Setup Wizard</h2>
        <p className="text-slate-400">Checklist guiado para linkar API, n8n, Evolution, WhatsApp, financeiro e monitoramento.</p>
      </div>
      {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {(wizard.steps || []).map((step: any, index: number) => (
          <article key={step.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-cyan-200">Etapa {index + 1}</p>
                <h3 className="text-xl font-black text-white">{step.title}</h3>
              </div>
              <StatusPill status={step.status} />
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              {step.url && <p className="truncate">URL: {step.url}</p>}
              {step.webhookUrl && <p className="truncate">Webhook: {step.webhookUrl}</p>}
              {step.wakePhrase && <p>Wake phrase: {step.wakePhrase}</p>}
              {step.requireImportReview && <p>Importacao exige revisao: sim</p>}
            </div>
            <button className="btn btn-ghost mt-4" onClick={() => test(step.id === "api" ? "api_public" : step.id === "evolution" ? "whatsapp" : step.id)}><FlaskConical size={16} /> Testar etapa</button>
          </article>
        ))}
      </div>
      <div className="glass rounded-2xl p-5 text-sm text-slate-300">
        <p className="flex items-center gap-2 font-semibold text-white"><CheckCircle2 size={18} className="text-cyanx" /> Ao finalizar</p>
        <p className="mt-2">Valide no WhatsApp real com "ei jarvis status do sistema" e envie OFX/CSV com legenda "ei jarvis importar esse extrato do Inter". O JARVIS deve criar uma previa em `/finance/import/:id/review`.</p>
      </div>
    </section>
  );
}
