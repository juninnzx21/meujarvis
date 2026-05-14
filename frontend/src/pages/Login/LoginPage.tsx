import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bot, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { friendlyError } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("admin@jarvis.local");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx shadow-glow"><Bot size={34} /></div>
          <h1 className="text-3xl font-black text-white">JARVIS Home AI</h1>
          <p className="mt-2 text-slate-300">Seu assistente inteligente para casa, rotina e automações.</p>
        </div>
        <label className="mb-4 block text-sm font-semibold text-slate-300">Email<input className="input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="mb-4 block text-sm font-semibold text-slate-300">Senha<input className="input mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading} className="btn btn-primary w-full"><Lock size={18} /> {loading ? "Autenticando..." : "Entrar"}</button>
        <p className="mt-5 rounded-xl bg-white/5 p-3 text-sm text-slate-300">Demo: admin@jarvis.local / 12345678</p>
      </motion.form>
    </main>
  );
}
