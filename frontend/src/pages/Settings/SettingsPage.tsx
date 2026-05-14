import { useEffect, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";

const booleanKeys = ["voice_enabled", "whatsapp_enabled", "whatsapp_auto_reply", "n8n_enabled", "home_assistant_enabled", "formal_mode", "require_confirmation_for_sensitive_actions"];

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [health, setHealth] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/settings"), api.get("/health/full")]).then(([settingsRes, healthRes]) => {
      setSettings(settingsRes.data.settings);
      setHealth(healthRes.data);
    });
  }, []);

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
    </section>
  );
}
