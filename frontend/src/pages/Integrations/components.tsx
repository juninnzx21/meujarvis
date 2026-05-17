import { CheckCircle2, Clipboard, EyeOff, Info, ListChecks, XCircle } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";

export function ConnectionStatusBadge({ status }: { status?: string | boolean }) {
  return <StatusPill status={status} />;
}

export function SecretInputMasked({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-300">
      Segredo
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3">
        <EyeOff size={16} className="text-slate-500" />
        <input className="min-h-12 flex-1 bg-transparent text-sm text-white outline-none" type="password" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}

export function ManualActionChecklist({ steps }: { steps?: string[] }) {
  if (!steps?.length) return null;
  return (
    <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
      <p className="mb-3 flex items-center gap-2 font-bold"><ListChecks size={16} /> Como deixar esta etapa funcionando</p>
      <ol className="space-y-2">
        {steps.map((step, index) => <li key={step} className="leading-relaxed"><span className="font-bold">{index + 1}.</span> {step}</li>)}
      </ol>
    </div>
  );
}

export function WebhookCopyBox({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      <div className="mt-2 flex gap-2">
        <input className="input" readOnly value={value} />
        <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(value)}><Clipboard size={16} /> Copiar</button>
      </div>
    </label>
  );
}

export function IntegrationTestResult({ result }: { result?: string }) {
  if (!result) return null;
  return <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{result}</p>;
}

export function SetupProgressSummary({ providers }: { providers: Array<{ status: string }> }) {
  const total = providers.length || 1;
  const ok = providers.filter((item) => item.status === "configured").length;
  const attention = providers.filter((item) => item.status !== "configured").length;
  return (
    <div className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-3">
      <div>
        <p className="text-sm text-slate-400">Progresso</p>
        <p className="text-3xl font-black text-white">{Math.round((ok / total) * 100)}%</p>
      </div>
      <p className="flex items-center gap-2 text-sm text-cyan-100"><CheckCircle2 size={18} /> {ok} configurado(s)</p>
      <p className="flex items-center gap-2 text-sm text-amber-100"><XCircle size={18} /> {attention} com acao pendente</p>
    </div>
  );
}

const pendingGuides = [
  {
    title: "Preencher n8n no wizard",
    body: "Conecta o JARVIS aos workflows de automacao. Informe a URL do n8n, token/API key e webhook secret; depois teste e importe os workflows padrao."
  },
  {
    title: "Preencher Evolution API no wizard",
    body: "Permite que o JARVIS use a Evolution para conectar o WhatsApp. Informe URL, instancia e API key sem expor a chave real no frontend."
  },
  {
    title: "Gerar QR do WhatsApp pelo painel",
    body: "Cria o QR Code para parear seu numero. Escaneie no celular e acompanhe o status ate ficar conectado/open."
  },
  {
    title: "Configurar webhook automaticamente",
    body: "Liga a Evolution ao webhook oficial do JARVIS. Se a versao da API nao permitir, o painel mostra o checklist manual."
  },
  {
    title: "Testar WhatsApp com ei jarvis",
    body: "Confirma que o bot responde apenas com a frase obrigatoria. Envie: ei jarvis status do sistema."
  },
  {
    title: "Configurar Home Assistant",
    body: "Permite listar entidades e executar acoes seguras de casa inteligente. Use URL e token de longa duracao, sempre mascarado."
  },
  {
    title: "Configurar backup offsite",
    body: "Garante copia fora da VPS/local. Use S3, rclone, Google Drive ou outra VPS com criptografia e retencao definida."
  },
  {
    title: "Revisar erros antigos do scheduler",
    body: "Ajuda a entender falhas historicas. Abra Logs, filtre modulo scheduler e procure rotinas_error, overdue_error ou tick_error."
  },
  {
    title: "Rotacionar credenciais compartilhadas",
    body: "Troque senhas/tokens que ja circularam fora de um vault. Depois salve novas credenciais apenas em .env, painel seguro ou gerenciador."
  },
  {
    title: "Validar OFX/CSV criando previa",
    body: "Garante que extrato nao entra direto. Envie OFX/CSV e confirme que abriu uma revisao em /finance/import/:id/review."
  }
];

export function OperationalGuidancePanel() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-cyan-400/15 p-2 text-cyan-100"><Info size={18} /></div>
        <div>
          <p className="font-bold text-white">Pendencias orientadas</p>
          <p className="text-sm text-slate-400">Use esta lista como roteiro para deixar o JARVIS redondinho. Cada item explica o que faz e como validar.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {pendingGuides.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
