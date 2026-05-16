import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("jarvis_pwa_dismissed") === "true");

  useEffect(() => {
    const handler = (installEvent: Event) => {
      installEvent.preventDefault();
      setEvent(installEvent as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!event || dismissed) return null;

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  }

  function dismiss() {
    localStorage.setItem("jarvis_pwa_dismissed", "true");
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-cyan-400/25 bg-slate-950/95 p-4 shadow-glow backdrop-blur md:left-auto md:right-6 md:w-96 lg:bottom-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyanx"><Download size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">Instalar JARVIS no celular</p>
          <p className="mt-1 text-sm text-slate-400">Use como app PWA, com atalhos para voz, chat, tarefas, financeiro e status.</p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary px-3 py-2 text-sm" onClick={install}>Instalar</button>
            <button className="btn btn-ghost px-3 py-2 text-sm" onClick={dismiss}>Agora nao</button>
          </div>
        </div>
        <button aria-label="Fechar instalacao PWA" className="rounded-lg p-1 text-slate-400 hover:bg-white/5" onClick={dismiss}><X size={18} /></button>
      </div>
    </div>
  );
}
