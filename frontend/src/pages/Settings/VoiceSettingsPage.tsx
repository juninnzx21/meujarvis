import { useEffect, useState } from "react";
import { Save, Square, Volume2 } from "lucide-react";
import { getAvailableVoices, jarvisVoicePreset, loadVoiceSettings, saveVoiceSettings, selectBestJarvisVoice, stopSpeaking, testVoice, type JarvisVoiceSettings } from "../../services/textToSpeechService";

export function VoiceSettingsPage() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<JarvisVoiceSettings>(loadVoiceSettings());
  const [message, setMessage] = useState("");

  useEffect(() => {
    function refresh() {
      const nextVoices = getAvailableVoices();
      setVoices(nextVoices);
      if (!settings.voiceURI) {
        const best = selectBestJarvisVoice(nextVoices);
        if (best) setSettings((current) => ({ ...current, voiceURI: best.voiceURI, lang: best.lang || current.lang }));
      }
    }
    refresh();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = refresh;
  }, []);

  function update(partial: Partial<JarvisVoiceSettings>) {
    setSettings((current) => ({ ...current, ...partial, preset: partial.preset || "custom" }));
  }

  function applyPreset() {
    const best = selectBestJarvisVoice(voices);
    setSettings({ ...jarvisVoicePreset, voiceURI: best?.voiceURI || "", lang: best?.lang || jarvisVoicePreset.lang });
    setMessage("Preset JARVIS BR Premium aplicado.");
  }

  function save() {
    const saved = saveVoiceSettings(settings);
    setSettings(saved);
    setMessage("Configuracao de voz salva neste navegador.");
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="glass space-y-5 rounded-2xl p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Voz original</p>
          <h2 className="text-3xl font-black text-white">JARVIS BR Premium</h2>
          <p className="mt-2 text-slate-400">Configure uma voz calma, grave, elegante e tecnologica usando SpeechSynthesis local do navegador.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" type="button" onClick={applyPreset}>Aplicar preset</button>
          <button className="btn btn-ghost" type="button" onClick={() => testVoice(settings)}><Volume2 size={18} /> Testar voz</button>
          <button className="btn btn-ghost" type="button" onClick={stopSpeaking}><Square size={18} /> Parar fala</button>
        </div>
        <label className="block text-sm font-semibold text-slate-300">
          Voz do navegador
          <select className="input mt-2" value={settings.voiceURI} onChange={(event) => {
            const voice = voices.find((item) => item.voiceURI === event.target.value);
            update({ voiceURI: event.target.value, lang: voice?.lang || settings.lang });
          }}>
            <option value="">Melhor voz disponivel automaticamente</option>
            {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} - {voice.lang}</option>)}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-300">Idioma<input className="input mt-2" value={settings.lang} onChange={(event) => update({ lang: event.target.value })} /></label>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200"><span>Resposta falada ativa</span><input type="checkbox" checked={settings.spokenRepliesEnabled} onChange={(event) => update({ spokenRepliesEnabled: event.target.checked })} /></label>
          <label className="block text-sm font-semibold text-slate-300">Velocidade: {settings.rate.toFixed(2)}<input className="mt-2 w-full" type="range" min="0.6" max="1.4" step="0.01" value={settings.rate} onChange={(event) => update({ rate: Number(event.target.value) })} /></label>
          <label className="block text-sm font-semibold text-slate-300">Tom/pitch: {settings.pitch.toFixed(2)}<input className="mt-2 w-full" type="range" min="0.5" max="1.5" step="0.01" value={settings.pitch} onChange={(event) => update({ pitch: Number(event.target.value) })} /></label>
          <label className="block text-sm font-semibold text-slate-300">Volume: {settings.volume.toFixed(2)}<input className="mt-2 w-full" type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={(event) => update({ volume: Number(event.target.value) })} /></label>
        </div>
        <button className="btn btn-primary" type="button" onClick={save}><Save size={18} /> Salvar configuracoes</button>
        {message && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
      </div>
      <aside className="glass rounded-2xl p-5 text-sm text-slate-300">
        <h3 className="mb-3 font-bold text-white">Como deixar mais grave/elegante</h3>
        <p>Use velocidade entre 0.90 e 0.95, pitch entre 0.75 e 0.88 e volume em 1. Prefira voz masculina/neutra pt-BR; se nao houver, teste en-GB.</p>
        <h3 className="mb-3 mt-6 font-bold text-white">Limites reais</h3>
        <p>A qualidade depende das vozes instaladas no navegador/sistema. Este preset nao clona voz de ator, filme ou personagem.</p>
      </aside>
    </section>
  );
}
