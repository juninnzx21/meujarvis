import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ClipboardCheck, ExternalLink, LockKeyhole, ShieldAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import { parseCandidates, type ReleaseCandidate } from "./releaseCandidates";

/**
 * QA console remains read-only until trusted GitHub provenance, verified author
 * identity, CI/branch-protection gates and independent security review exist.
 * The backend enforces its own checks; disabled buttons are not an authorization boundary.
 */
export function QaReleasesPage() {
  const { user } = useAuth();
  const qaHost = window.location.hostname === "qa.jarvis.juninnzxtec.com.br" ||
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const allowed = qaHost && user?.role === "admin";
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCandidates([]);
    if (!allowed) return () => controller.abort();
    setLoading(true);
    setFailed(false);
    void api.get("/releases/candidates", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setCandidates(parseCandidates(data));
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, user?.id, refresh]);

  if (!qaHost || user?.role !== "admin") {
    return (
      <section className="glass rounded-2xl p-6" role="alert">
        <h2 className="mb-2 text-xl font-bold text-white">Área administrativa indisponível</h2>
        <p className="text-slate-300">A central de releases requer o ambiente QA e conta administrativa.</p>
        <Link className="mt-4 inline-block text-cyan-100 underline" to="/">Voltar ao painel</Link>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label="Revisão de versões em QA">
      <header>
        <h2 className="flex items-center gap-2 text-3xl font-black text-white">
          <ClipboardCheck aria-hidden="true" /> Central de Aprovação QA
        </h2>
        <p className="mt-2 text-slate-300">Revise versões candidatas do JARVIS antes de qualquer publicação na produção.</p>
      </header>

      <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-amber-100" role="status">
        <h3 className="flex items-center gap-2 font-bold"><ShieldAlert size={19} /> Aprovações bloqueadas por proveniência pendente</h3>
        <p className="mt-2 text-sm">
          A API local registra rascunhos e aplica MFA, validade de 30 minutos, consumo único e auditoria.
          Metadados do navegador não são prova: falta uma origem confiável do GitHub para validar autor, SHA,
          digest, CI e proteção da branch. Esta API não inicia deploy e nenhum clique altera a produção.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-bold text-white">Versões candidatas</h3>
          <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} className="mb-4 text-cyan-100 underline disabled:opacity-50">Atualizar versões</button>
          {loading && <p role="status" className="text-slate-300">Carregando versões…</p>}
          {failed && <p role="alert" className="text-amber-100">Não foi possível consultar as versões. Verifique sua sessão e tente atualizar.</p>}
          {!loading && !failed && candidates.length === 0 && <p className="text-slate-400">Nenhuma versão candidata registrada.</p>}
          {!failed && candidates.map((candidate) => (
            <article key={candidate.id} className="mb-4 min-w-0 rounded-xl border border-white/10 p-4 [overflow-wrap:anywhere]" aria-label={`Versão ${candidate.commitSha}`}>
              <h4 className="font-bold text-white">{candidate.artifactName}</h4>
              <dl className="mt-2 space-y-2 text-sm text-slate-300">
                <div><dt>SHA</dt><dd className="font-mono">{candidate.commitSha}</dd></div>
                <div><dt>Digest</dt><dd className="font-mono">{candidate.artifactDigest}</dd></div>
                <div><dt>Branch / destino / estado</dt><dd>{candidate.sourceBranch} / {candidate.target} / {candidate.status}</dd></div>
                <div><dt>Resultado informado da CI</dt><dd>{candidate.ciConclusion}</dd></div>
                <div><dt>Origem verificada</dt><dd>{candidate.sourceVerifiedAt ? "Registrada na API" : "Pendente"}</dd></div>
                <div><dt>Verificação dos testes obrigatórios</dt><dd>{candidate.checksVerifiedAt ? "Registrada na API" : "Pendente"}</dd></div>
                <div><dt>Staging validado</dt><dd>{candidate.stagingValidatedAt ? "Registrado na API" : "Pendente"}</dd></div>
                <div><dt>Rollback validado</dt><dd>{candidate.rollbackVerifiedAt ? "Registrado na API" : "Pendente"}</dd></div>
              </dl>
              {/^[0-9]{1,24}$/.test(candidate.workflowRunId) && <a className="mt-3 inline-block text-cyan-100 underline" href={`https://github.com/juninnzx21/meujarvis/actions/runs/${candidate.workflowRunId}`} target="_blank" rel="noopener noreferrer">Consultar execução da CI</a>}
              <details className="mt-3 text-sm text-slate-300">
                <summary>Histórico de decisões e auditoria</summary>
                {candidate.approvalRequests.length === 0 && <p>Nenhuma decisão registrada.</p>}
                {candidate.approvalRequests.map((request) => <p key={request.id}>{request.status} · Validade: {new Date(request.expiresAt).toLocaleString("pt-BR")}{request.decisionReason ? ` · ${request.decisionReason}` : ""}</p>)}
                {candidate.auditEvents.map((event) => <p key={event.id}>{event.eventType} · {new Date(event.createdAt).toLocaleString("pt-BR")}</p>)}
              </details>
            </article>
          ))}
          <a className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-100 underline"
             href="https://github.com/juninnzx21/meujarvis/pulls" target="_blank" rel="noopener noreferrer">
            Consultar pull requests no GitHub <ExternalLink size={15} />
          </a>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
            <LockKeyhole size={20} /> Decisão do proprietário
          </h3>
          <p className="mb-4 text-sm text-slate-300">
            A aprovação exige SHA e digest imutáveis, MFA e identidade GitHub distinta do autor. O gate de deploy continua desligado.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled title="Aguardando backend de aprovação e gates de segurança"
              className="rounded-xl border border-cyan-300/30 px-4 py-2 text-sm font-bold text-cyan-100 opacity-50">
              Aprovar e publicar
            </button>
            <button type="button" disabled title="Aguardando backend de aprovação e gates de segurança"
              className="rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-bold text-rose-100 opacity-50">
              Rejeitar
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Consulta integrada à API. Decisões continuam bloqueadas até validar proveniência, staging e o fluxo de publicação.</p>
        </div>
      </div>
    </section>
  );
}
