import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FlaskConical, RefreshCw, Save, ShieldCheck, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { api, friendlyError } from "../../services/api";
import { ConnectionStatusBadge, IntegrationTestResult, ManualActionChecklist, SecretInputMasked, SetupProgressSummary, WebhookCopyBox } from "./components";

type SetupStep = {
  provider: string;
  title: string;
  description: string;
  status: string;
  configured: boolean;
  maskedFields?: Record<string, unknown>;
  publicUrls?: Record<string, string>;
  actions?: string[];
  manualSteps?: string[];
  routePath?: string;
  docsPath?: string;
};

const defaultProviderInputs: Record<string, Record<string, string | boolean>> = {
  api_public: {
    frontendPublicUrl: "https://jarvis.juninnzxtec.com.br",
    apiPublicUrl: "https://apijarvis.juninnzxtec.com.br/api",
    whatsappWebhookUrl: "https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook",
    n8nPublicUrl: "https://n8njarvis.juninnzxtec.com.br"
  },
  n8n: { webhookUrl: "", apiKey: "", webhookSecret: "", enabled: true },
  whatsapp: { apiUrl: "", apiKey: "", instance: "jarvis", autoReply: false },
  evolution: { apiUrl: "", apiKey: "", instance: "jarvis", autoReply: false },
  home_assistant: { url: "", token: "" },
  finance: { defaultAccountName: "PJ DO INTER", defaultAccountId: "", token: "", apiUrl: "" },
  monitoring: { enabled: false },
  backup: { enabled: false }
};

function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    frontendPublicUrl: "Frontend publico",
    apiPublicUrl: "API oficial",
    whatsappWebhookUrl: "Webhook WhatsApp",
    n8nPublicUrl: "URL publica n8n",
    webhookUrl: "Webhook URL",
    apiUrl: "URL da API",
    instance: "Instancia",
    defaultAccountName: "Conta padrao",
    defaultAccountId: "ID da conta",
    url: "URL",
    enabled: "Habilitado",
    autoReply: "Resposta automatica"
  };
  return labels[key] || key;
}

export function IntegrationStepCard({
  step,
  active,
  inputs,
  onInput,
  onSave,
  onTest,
  onBootstrap,
  onWebhook
}: {
  step: SetupStep;
  active: boolean;
  inputs: Record<string, string | boolean>;
  onInput: (key: string, value: string | boolean) => void;
  onSave: () => void;
  onTest: () => void;
  onBootstrap: () => void;
  onWebhook: () => void;
}) {
  const fields = Object.entries(inputs || {});
  return (
    <article className={`glass rounded-2xl p-5 ${active ? "ring-1 ring-cyan-300/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">{step.provider}</p>
          <h3 className="text-xl font-black text-white">{step.title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{step.description}</p>
        </div>
        <ConnectionStatusBadge status={step.status} />
      </div>

      {fields.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {fields.map(([key, value]) => {
            const isSecret = /(apiKey|token|secret|password)/i.test(key);
            if (typeof value === "boolean") {
              return <label key={key} className="flex min-h-12 items-center gap-2 rounded-xl bg-white/5 px-3 text-sm text-slate-300"><input type="checkbox" checked={value} onChange={(event) => onInput(key, event.target.checked)} /> {fieldLabel(key)}</label>;
            }
            if (isSecret) return <SecretInputMasked key={key} value={String(value)} onChange={(next) => onInput(key, next)} placeholder={step.maskedFields?.[`${key}Configured`] ? "Configurado - deixe em branco para manter" : fieldLabel(key)} />;
            return (
              <label key={key} className="block text-sm font-semibold text-slate-300">
                {fieldLabel(key)}
                <input className="input mt-2" value={String(value)} onChange={(event) => onInput(key, event.target.value)} />
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-2 text-sm text-slate-400">
        {Object.entries(step.maskedFields || {}).slice(0, 8).map(([key, value]) => <p key={key}>{fieldLabel(key)}: {String(value)}</p>)}
      </div>
      <div className="mt-4 grid gap-3">
        {Object.entries(step.publicUrls || {}).map(([key, value]) => <WebhookCopyBox key={key} label={fieldLabel(key)} value={value} />)}
      </div>
      <ManualActionChecklist steps={step.manualSteps} />
      <div className="mt-4 flex flex-wrap gap-2">
        {fields.length > 0 && <button type="button" className="btn btn-primary" onClick={onSave}><Save size={16} /> Salvar</button>}
        <button type="button" className="btn btn-ghost" onClick={onTest}><FlaskConical size={16} /> Testar</button>
        <button type="button" className="btn btn-ghost" onClick={onBootstrap}><RefreshCw size={16} /> Configurar auto</button>
        {(step.provider === "whatsapp" || step.provider === "evolution" || step.provider === "n8n") && <button type="button" className="btn btn-ghost" onClick={onWebhook}><Workflow size={16} /> Webhook/workflows</button>}
        {step.routePath && <Link className="btn btn-ghost" to={step.routePath}><ExternalLink size={16} /> Abrir</Link>}
        {step.docsPath && <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(step.docsPath || "")}><Copy size={16} /> Doc</button>}
      </div>
    </article>
  );
}

export function IntegrationWizardPage() {
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [selected, setSelected] = useState("api_public");
  const [inputs, setInputs] = useState<Record<string, Record<string, string | boolean>>>(defaultProviderInputs);
  const [message, setMessage] = useState("");

  const selectedStep = useMemo(() => steps.find((step) => step.provider === selected) || steps[0], [steps, selected]);

  async function load() {
    const res = await api.get("/integrations/setup");
    const nextSteps = res.data.steps || [];
    setSteps(nextSteps);
    if (!nextSteps.some((step: SetupStep) => step.provider === selected)) setSelected(nextSteps[0]?.provider || "api_public");
  }

  useEffect(() => { load().catch(() => setMessage("Nao foi possivel carregar o assistente universal.")); }, []);

  async function run(action: "save" | "test" | "bootstrap" | "webhook", provider: string) {
    try {
      setMessage("");
      const url = action === "save"
        ? `/integrations/setup/${provider}`
        : action === "test"
          ? `/integrations/setup/${provider}/test`
          : action === "webhook"
            ? `/integrations/setup/${provider}/configure-webhook`
            : `/integrations/setup/${provider}/bootstrap`;
      const res = action === "save" ? await api.put(url, inputs[provider] || {}) : await api.post(url, {});
      setMessage(res.data.message || `${provider}: ${res.data.status || "ok"}`);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  function updateInput(provider: string, key: string, value: string | boolean) {
    setInputs((current) => ({ ...current, [provider]: { ...(current[provider] || {}), [key]: value } }));
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black text-white">Assistente Universal de Configuracao</h2>
          <p className="text-slate-400">Conecte API, IA, n8n, WhatsApp, Home Assistant, financeiro, documentos, monitoramento, backup, mobile e seguranca pelo JARVIS.</p>
        </div>
        <Link to="/integrations/setup-summary" className="btn btn-ghost"><ShieldCheck size={18} /> Resumo final</Link>
      </div>
      <SetupProgressSummary providers={steps} />
      <IntegrationTestResult result={message} />
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <nav className="glass flex gap-2 overflow-x-auto rounded-2xl p-3 xl:flex-col xl:overflow-visible">
          {steps.map((step, index) => (
            <button key={step.provider} type="button" className={`rounded-xl px-3 py-3 text-left text-sm ${selected === step.provider ? "bg-cyan-400/15 text-cyan-100" : "text-slate-300 hover:bg-white/5"}`} onClick={() => setSelected(step.provider)}>
              <span className="block text-xs text-slate-500">Etapa {index + 1}</span>
              <span className="font-bold">{step.title}</span>
            </button>
          ))}
        </nav>
        {selectedStep && (
          <IntegrationStepCard
            step={selectedStep}
            active
            inputs={inputs[selectedStep.provider] || {}}
            onInput={(key, value) => updateInput(selectedStep.provider, key, value)}
            onSave={() => run("save", selectedStep.provider)}
            onTest={() => run("test", selectedStep.provider)}
            onBootstrap={() => run("bootstrap", selectedStep.provider)}
            onWebhook={() => run("webhook", selectedStep.provider)}
          />
        )}
      </div>
    </section>
  );
}
