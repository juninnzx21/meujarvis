import { Link } from "react-router-dom";
import { ClipboardCheck, ExternalLink, LockKeyhole, ShieldAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

/**
 * QA console is intentionally read-only until the signed, one-time approval
 * backend and production workflow have passed security review.
 * A disabled UI is NOT an authorization boundary; future actions must enforce
 * admin, MFA step-up, SHA+digest pinning, audit and CI gates on the server.
 */
export function QaReleasesPage() {
  const { user } = useAuth();
  const qaHost = window.location.hostname === "qa.jarvis.juninnzxtec.com.br" ||
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

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
        <h3 className="flex items-center gap-2 font-bold"><ShieldAlert size={19} /> Fluxo de publicação ainda não ativado</h3>
        <p className="mt-2 text-sm">
          A API segura de candidatos, aprovação/rejeição com MFA, verificação de SHA e o deploy protegido
          ainda precisam ser implementados e validados. Nenhum clique nesta página altera a produção.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-bold text-white">Versões candidatas</h3>
          <p className="text-slate-400">
            Nenhuma versão foi carregada. O sistema não possui um endpoint de candidatos de release
            validado para esta tela; não serão mostradas versões ou testes fictícios.
          </p>
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
            Quando o serviço de aprovações estiver concluído, cada decisão ficará vinculada ao SHA
            exato, digest do artefato, identidade administrativa e validade da autorização.
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
          <p className="mt-3 text-xs text-slate-400">Controles desabilitados: nenhuma aprovação, rejeição ou deploy está funcional.</p>
        </div>
      </div>
    </section>
  );
}
