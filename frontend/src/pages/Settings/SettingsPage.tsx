import { useEffect, useState } from "react";
import { Save, ShieldCheck, ShieldOff } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const booleanKeys = ["voice_enabled", "whatsapp_enabled", "whatsapp_auto_reply", "n8n_enabled", "home_assistant_enabled", "formal_mode", "require_confirmation_for_sensitive_actions"];

export function SettingsPage() {
  const { user, acceptSession } = useAuth();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [health, setHealth] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [mfa, setMfa] = useState<{ enabled: boolean; recoveryCodesRemaining: number } | null>(null);
  const [mfaPassword, setMfaPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaMessage, setMfaMessage] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/settings"), api.get("/health/full")]).then(([settingsRes, healthRes]) => {
      setSettings(settingsRes.data.settings);
      setHealth(healthRes.data);
    });
  }, []);

  useEffect(() => {
    if (user?.role === "admin") api.get("/auth/mfa/status").then((response) => setMfa(response.data)).catch(() => setMfa(null));
  }, [user?.role]);

  async function disableMfa() {
    setMfaBusy(true); setMfaMessage("");
    try {
      const response = await api.post("/auth/mfa/disable", { password: mfaPassword, code: mfaCode });
      acceptSession(response.data); setMfa({ enabled: false, recoveryCodesRemaining: 0 }); setMfaPassword(""); setMfaCode(""); setRecoveryCodes([]);
      setMfaMessage("MFA desativado; as sessões anteriores foram revogadas.");
    } catch (error) { setMfaMessage(error instanceof Error ? error.message : "Não foi possível desativar o MFA."); }
    finally { setMfaBusy(false); }
  }

  async function save() {
    await api.put("/settings", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Configuracoes</h2>
      <div className="glass space-y-5 rounded-2xl p-5">
        <label className="block text-sm font-semibold text-slate-300">
          Nome do assistente
          <input className="input mt-2" value={settings.assistant_name || ""} onChange={(e) => setSettings({ ...settings, assistant_name: e.target.value })} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          {booleanKeys.map((key) => (
            <label key={key} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-slate-200">
              <span>{key}</span>
              <input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} />
            </label>
          ))}
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-white/5 p-4 text-sm text-slate-300">
          <p className="mb-3 flex items-center gap-2 font-semibold text-white"><ShieldCheck size={18} className="text-cyanx" /> Status das credenciais</p>
          <div className="grid gap-2 md:grid-cols-2">
            <span>OpenAI: {health.integrations?.openai?.status || (health.openaiConfigured ? "configured" : "missing_key")}</span>
            <span>Gemini fallback: {health.integrations?.gemini?.status || (health.geminiConfigured ? "configured" : "missing_key")}</span>
            <span>n8n: {health.n8nConfigured ? "configurado" : "nao configurado"}</span>
            <span>WhatsApp: {health.whatsappConfigured ? "configurado" : "nao configurado"}</span>
            <span>Home Assistant: {health.homeAssistantConfigured ? "configurado" : "nao configurado"}</span>
          </div>
        </div>
        <button onClick={save} className="btn btn-primary"><Save size={18} /> Salvar preferencias</button>
        {saved && <span className="ml-3 text-cyan-200">Salvo.</span>}
      </div>
      {user?.role === "admin" && <section className="glass space-y-4 rounded-2xl p-5">
        <div className="flex items-center gap-3"><ShieldCheck className="text-cyanx" /><div><h3 className="text-xl font-bold text-white">Autenticação em dois fatores</h3><p className="text-sm text-slate-400">Proteja o login administrativo com Google Authenticator, Microsoft Authenticator ou outro app TOTP.</p></div></div>
        <p className="text-sm text-slate-300">Status: {mfa?.enabled ? `Ativo · ${mfa.recoveryCodesRemaining} códigos de recuperação restantes` : "Desativado"}</p>
        {!mfa?.enabled && <p className="rounded-xl bg-amber-300/10 p-3 text-sm text-amber-100">A autenticação administrativa exige MFA. Saia da conta e entre novamente para configurar o autenticador com QR code.</p>}
        {mfa?.enabled && <div className="flex flex-wrap items-end gap-3"><label className="min-w-56 flex-1 text-sm text-slate-300">Senha atual<input className="input mt-2" type="password" autoComplete="current-password" value={mfaPassword} onChange={(event) => setMfaPassword(event.target.value)} /></label><label className="min-w-48 flex-1 text-sm text-slate-300">Código TOTP ou recuperação<input className="input mt-2" value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} /></label><button className="btn btn-ghost border border-red-400/30 text-red-200" disabled={mfaBusy || !mfaPassword || !mfaCode} onClick={disableMfa}><ShieldOff size={17} /> Desativar MFA</button></div>}
        {recoveryCodes.length > 0 && <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4"><p className="mb-2 font-semibold text-amber-100">Códigos de recuperação — guarde-os em local seguro</p><div className="grid gap-1 font-mono text-sm text-white sm:grid-cols-2">{recoveryCodes.map((code) => <code key={code}>{code}</code>)}</div><button className="mt-3 text-sm text-cyan-200 underline" onClick={() => setRecoveryCodes([])}>Já guardei; ocultar</button></div>}
        {mfaMessage && <p className="rounded-lg bg-white/5 p-3 text-sm text-slate-200">{mfaMessage}</p>}
      </section>}
    </section>
  );
}
