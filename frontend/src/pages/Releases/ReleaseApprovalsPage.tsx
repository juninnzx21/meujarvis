import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, GitCommitHorizontal, LockKeyhole, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { api, friendlyError } from "../../services/api";

type ReleaseCandidate = {
  id: string;
  commitSha: string;
  sourceBranch: string;
  version: string;
  target: string;
  workflowRunId: string;
  artifactId: string;
  artifactName?: string | null;
  artifactDigest?: string | null;
  artifactSize?: string | null;
  ciRunUrl?: string | null;
  status: string;
  blockedReasons: string[];
  createdAt: string;
  createdBy?: { name: string; email: string };
  approval?: { approverEmail: string; reason: string; createdAt: string } | null;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  TESTING: "Validando gates",
  READY_FOR_APPROVAL: "Pronta para aprovação",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  EXPIRED: "Expirada",
  DEPLOYED: "Publicada"
};

export function ReleaseApprovalsPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [version, setVersion] = useState("");
  const [target, setTarget] = useState("staging");
  const [workflowRunId, setWorkflowRunId] = useState("");
  const [artifactId, setArtifactId] = useState("");
  const [approvalId, setApprovalId] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/releases");
      setCandidates(response.data.candidates ?? []);
    } catch (cause) {
      setError(friendlyError(cause) || "Nao foi possivel carregar as releases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createCandidate(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create"); setError(""); setNotice("");
    try {
      const response = await api.post("/releases/candidates", { commitSha, version, target, workflowRunId, artifactId });
      setCandidates((current) => [response.data.candidate, ...current]);
      setCommitSha(""); setVersion(""); setWorkflowRunId(""); setArtifactId("");
      setNotice("Candidato criado. Valide as evidências do GitHub para consultar os gates.");
    } catch (cause) { setError(friendlyError(cause) || "Nao foi possivel criar o candidato."); }
    finally { setBusy(""); }
  }

  async function validateCandidate(id: string) {
    setBusy(id); setError(""); setNotice("");
    try {
      const response = await api.post(`/releases/${encodeURIComponent(id)}/validate`);
      setCandidates((current) => current.map((candidate) => candidate.id === id ? response.data.candidate : candidate));
      setNotice(response.data.candidate.status === "READY_FOR_APPROVAL" ? "Todos os gates foram confirmados." : "Validação concluída; a release segue bloqueada por gates pendentes.");
    } catch (cause) { setError(friendlyError(cause) || "Nao foi possivel validar as evidencias."); }
    finally { setBusy(""); }
  }

  async function approveCandidate(event: React.FormEvent) {
    event.preventDefault();
    if (!approvalId) return;
    setBusy(approvalId); setError(""); setNotice("");
    try {
      const stepUp = await api.post("/auth/mfa/step-up", { code: totpCode });
      const response = await api.post(`/releases/${encodeURIComponent(approvalId)}/approve`, { reason: approvalReason }, {
        headers: { "X-Jarvis-MFA-Step-Up": stepUp.data.token }
      });
      setCandidates((current) => current.map((candidate) => candidate.id === approvalId ? response.data.candidate : candidate));
      setTotpCode(""); setApprovalReason(""); setApprovalId("");
      setNotice(response.data.message);
    } catch (cause) { setError(friendlyError(cause) || "A aprovação foi bloqueada."); }
    finally { setBusy(""); }
  }

  if (user?.role !== "admin") return <section className="glass rounded-2xl p-6 text-amber-100">Acesso restrito a administradores.</section>;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Governanca de release</p>
          <h2 className="mt-2 flex items-center gap-3 text-3xl font-black text-white"><PackageCheck className="text-cyanx" /> Aprovação de releases</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">Cada solicitação fica vinculada ao commit completo e ao digest do artefato consultados no GitHub. A aprovação não executa publicação.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</button>
      </header>

      <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <div className="flex items-center gap-2 font-bold"><LockKeyhole size={17} /> Deploy desabilitado</div>
        <p className="mt-1">Staging, backup/restauração, rollback, health checks e proteção da branch ainda precisam de validação independente. Enquanto qualquer gate estiver pendente, o backend impede a aprovação.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div>}

      <form onSubmit={createCandidate} className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm text-slate-300 xl:col-span-2">SHA completo do commit
          <input required pattern="[a-fA-F0-9]{40}" maxLength={40} value={commitSha} onChange={(event) => setCommitSha(event.target.value)} className="input mt-1 w-full font-mono" placeholder="40 caracteres hexadecimais" />
        </label>
        <label className="text-sm text-slate-300">Versão candidata
          <input required pattern="v[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?" value={version} onChange={(event) => setVersion(event.target.value)} className="input mt-1 w-full" placeholder="v3.0.1-rc.1" />
        </label>
        <label className="text-sm text-slate-300">Destino
          <select value={target} onChange={(event) => setTarget(event.target.value)} className="input mt-1 w-full"><option value="staging">Staging</option><option value="production">Produção</option></select>
        </label>
        <span className="hidden xl:block" />
        <label className="text-sm text-slate-300">GitHub Actions run ID
          <input required inputMode="numeric" pattern="[0-9]{1,20}" value={workflowRunId} onChange={(event) => setWorkflowRunId(event.target.value)} className="input mt-1 w-full" />
        </label>
        <label className="text-sm text-slate-300">ID do artefato do GitHub
          <input required inputMode="numeric" pattern="[0-9]{1,20}" value={artifactId} onChange={(event) => setArtifactId(event.target.value)} className="input mt-1 w-full" />
        </label>
        <div className="flex items-end"><button className="btn btn-primary w-full" disabled={busy === "create"}>{busy === "create" ? "Criando..." : "Criar candidato"}</button></div>
        <p className="text-xs text-slate-500 md:col-span-2 xl:col-span-5">O backend aceita apenas artefatos do repositório oficial, commit em `main`, CI de sucesso e digest publicado pelo GitHub. Não cole chaves ou tokens.</p>
      </form>

      {approvalId && <form onSubmit={approveCandidate} className="glass grid gap-3 rounded-2xl p-5 md:grid-cols-3">
        <div className="md:col-span-3"><h3 className="font-bold text-white">Confirmação da aprovação</h3><p className="text-sm text-slate-400">Use seu código atual do autenticador. O token step-up expira em cinco minutos e só pode aprovar uma solicitação.</p></div>
        <label className="text-sm text-slate-300">Motivo
          <input required minLength={8} maxLength={1000} value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} className="input mt-1 w-full" />
        </label>
        <label className="text-sm text-slate-300">Código TOTP
          <input required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={totpCode} onChange={(event) => setTotpCode(event.target.value)} className="input mt-1 w-full" />
        </label>
        <div className="flex items-end gap-2"><button className="btn btn-primary flex-1" disabled={busy === approvalId}>Aprovar</button><button type="button" className="btn btn-ghost" onClick={() => setApprovalId("")}>Cancelar</button></div>
      </form>}

      <div className="space-y-3">
        {loading ? <p className="text-slate-400">Carregando candidatos...</p> : candidates.length === 0 ? <p className="glass rounded-xl p-5 text-slate-400">Nenhum candidato de release cadastrado.</p> : candidates.map((candidate) => (
          <article key={candidate.id} className="glass space-y-3 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{candidate.version} · {candidate.target}</h3>
                <p className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-400"><GitCommitHorizontal size={14} /> {candidate.commitSha}</p>
                <p className="mt-1 text-xs text-slate-500">Branch: {candidate.sourceBranch} · Run: {candidate.workflowRunId} · Solicitada por {candidate.createdBy?.email ?? "administrador"}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${candidate.status === "APPROVED" ? "border-emerald-400/40 text-emerald-200" : candidate.status === "READY_FOR_APPROVAL" ? "border-cyan-400/40 text-cyan-100" : "border-amber-400/40 text-amber-100"}`}>{statusLabel[candidate.status] ?? candidate.status}</span>
            </div>
            {candidate.artifactName && <p className="text-sm text-slate-300">Artefato: {candidate.artifactName} · {candidate.artifactSize ?? "?"} bytes</p>}
            {candidate.artifactDigest && <p className="break-all font-mono text-xs text-slate-400">SHA-256: {candidate.artifactDigest}</p>}
            {candidate.ciRunUrl && <a href={candidate.ciRunUrl} target="_blank" rel="noreferrer" className="text-sm text-cyan-200 underline">Abrir execução de CI no GitHub</a>}
            {candidate.blockedReasons?.length > 0 && <div className="rounded-xl border border-amber-300/20 bg-amber-500/5 p-3"><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100"><AlertTriangle size={15} /> Gates pendentes</p><ul className="list-disc space-y-1 pl-5 text-xs text-amber-100/80">{candidate.blockedReasons.map((reason, index) => <li key={`${candidate.id}-${index}`}>{reason}</li>)}</ul></div>}
            {candidate.approval && <p className="flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 size={16} /> Aprovada por {candidate.approval.approverEmail}: {candidate.approval.reason}</p>}
            <div className="flex flex-wrap gap-2">
              {(candidate.status === "DRAFT" || candidate.status === "TESTING") && <button className="btn btn-ghost" disabled={busy === candidate.id} onClick={() => void validateCandidate(candidate.id)}><ShieldCheck size={16} /> {busy === candidate.id ? "Validando..." : "Validar evidências"}</button>}
              {candidate.status === "READY_FOR_APPROVAL" && candidate.createdBy?.email !== user?.email && <button className="btn btn-primary" onClick={() => setApprovalId(candidate.id)}>Solicitar confirmação MFA para aprovar</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
