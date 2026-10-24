import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bot, Download, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, friendlyError } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export function LoginPage() {
  const { login, completeMfaLogin, acceptSession, user } = useAuth();
  const [email, setEmail] = useState("admin@jarvis.local");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [pendingSession, setPendingSession] = useState<{ token: string; user: { id: string; name: string; email: string; role: string } } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaCode, setMfaCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (challengeToken) {
        await completeMfaLogin(challengeToken, mfaCode);
      } else if (setupToken && mfaSetup) {
        const response = await api.post("/auth/mfa/enrollment/confirm", { setupToken, code: mfaCode });
        setPendingSession({ token: response.data.token, user: response.data.user });
        setRecoveryCodes(response.data.recoveryCodes);
      } else {
        const result = await login(email, password);
        if ("mfaRequired" in result && result.mfaRequired) setChallengeToken(result.challengeToken);
        if ("mfaSetupRequired" in result && result.mfaSetupRequired) {
          setSetupToken(result.setupToken);
          const setup = await api.post("/auth/mfa/enrollment/start", { setupToken: result.setupToken });
          setMfaSetup(setup.data);
        }
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function finishEnrollment() {
    if (pendingSession) acceptSession(pendingSession);
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx shadow-glow"><Bot size={34} /></div>
          <h1 className="text-3xl font-black text-white">JARVIS 2.0</h1>
          <p className="mt-2 text-slate-300">Seu assistente inteligente para casa, rotina e automações.</p>
        </div>
        {pendingSession ? <div className="space-y-4">
          <p className="rounded-xl bg-amber-300/10 p-3 text-sm text-amber-100">MFA ativado. Guarde os códigos de recuperação agora. Cada código só pode ser usado uma vez.</p>
          <div className="grid gap-1 rounded-xl bg-slate-950 p-4 font-mono text-sm text-white sm:grid-cols-2">{recoveryCodes.map((code) => <code key={code}>{code}</code>)}</div>
          <button type="button" className="btn btn-primary w-full" onClick={finishEnrollment}>Guardei os códigos — continuar</button>
        </div> : setupToken && mfaSetup ? <div className="space-y-4">
          <p className="text-sm text-cyan-100">O acesso administrativo exige autenticador. Leia o QR code e confirme o primeiro código.</p>
          <img className="mx-auto rounded-xl bg-white p-2" width={220} height={220} src={mfaSetup.qrDataUrl} alt="QR code de configuração do autenticador" />
          <div><span className="text-xs text-slate-400">Chave para configuração manual</span><code className="mt-1 block break-all rounded-lg bg-slate-950 p-3 text-sm text-cyan-100">{mfaSetup.secret}</code></div>
          <label className="block text-sm font-semibold text-slate-300">Código de seis dígitos<input className="input mt-2" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))} /></label>
          <button type="button" className="text-sm text-slate-400 underline" onClick={() => { setSetupToken(""); setMfaSetup(null); setMfaCode(""); setError(""); }}>Voltar ao login</button>
          {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={loading || mfaCode.length !== 6} className="btn btn-primary w-full"><Lock size={18} /> {loading ? "Verificando..." : "Ativar e confirmar MFA"}</button>
        </div> : !challengeToken ? <>
          <label className="mb-4 block text-sm font-semibold text-slate-300">Email<input className="input mt-2" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="mb-4 block text-sm font-semibold text-slate-300">Senha<input className="input mt-2" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        </> : <>
          <p className="mb-4 rounded-xl bg-cyan-400/10 p-3 text-sm text-cyan-100">A senha foi validada. Digite o código atual do seu autenticador para concluir o acesso administrativo.</p>
          <label className="mb-4 block text-sm font-semibold text-slate-300">{useRecoveryCode ? "Código de recuperação" : "Código do autenticador"}<input className="input mt-2" autoComplete="one-time-code" inputMode="text" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} /></label>
          <button type="button" className="mb-4 text-sm text-cyan-200 underline" onClick={() => { setUseRecoveryCode(!useRecoveryCode); setMfaCode(""); }}>{useRecoveryCode ? "Usar código do autenticador" : "Usar código de recuperação"}</button>
          <button type="button" className="mb-4 block text-sm text-slate-400 underline" onClick={() => { setChallengeToken(""); setMfaCode(""); setError(""); }}>Voltar ao login</button>
        </>}
        {error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        {!setupToken && !pendingSession && <button disabled={loading || Boolean(challengeToken && !mfaCode.trim())} className="btn btn-primary w-full"><Lock size={18} /> {loading ? "Autenticando..." : challengeToken ? "Verificar código" : "Entrar"}</button>}
        <Link to="/install" className="install-login-link"><Download size={16} /> Instalar JARVIS no PC ou Android</Link>
        <p className="mt-5 rounded-xl bg-white/5 p-3 text-sm text-slate-300">Demo: admin@jarvis.local / 12345678</p>
      </motion.form>
    </main>
  );
}
