import { useEffect, useState } from "react";
import { ArrowRight, Bot, Check, Download, ExternalLink, Monitor, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function getPlatform() {
  const agent = navigator.userAgent.toLowerCase();
  if (/android/.test(agent)) return "android";
  if (/iphone|ipad|ipod/.test(agent)) return "ios";
  return "desktop";
}

export function InstallPage() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [platform] = useState(getPlatform);
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); setMessage("JARVIS instalado com sucesso neste dispositivo."); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setMessage(choice.outcome === "accepted" ? "Instalação iniciada. Procure o ícone do JARVIS na tela inicial ou na área de trabalho." : "Tudo bem. Você pode instalar depois pelo menu do navegador.");
    setPromptEvent(null);
  }

  const device = platform === "android" ? "Android" : platform === "ios" ? "iPhone ou iPad" : "Windows ou computador";
  const steps = platform === "android"
    ? ["Abra esta página no Google Chrome.", "Toque em Instalar app no aviso ou no menu ⋮ do Chrome.", "Confirme Instalar e abra o ícone JARVIS na tela inicial."]
    : platform === "ios"
      ? ["Abra esta página no Safari.", "Toque em Compartilhar e escolha Adicionar à Tela de Início.", "Confirme Adicionar e abra JARVIS pelo novo ícone."]
      : ["Abra esta página no Chrome ou Microsoft Edge.", "Use o botão Instalar JARVIS ou o ícone de instalação na barra de endereço.", "Confirme a instalação para adicionar JARVIS ao menu Iniciar e à área de trabalho."];

  return (
    <main className="install-page">
      <div className="install-page__top"><Link to="/login" className="install-brand"><span><Bot size={22} /></span><strong>JARVIS <small>2.0 · HOME AI</small></strong></Link><Link to="/login" className="install-login">Entrar <ArrowRight size={16} /></Link></div>
      <section className="install-hero">
        <div className="install-hero__copy">
          <p className="install-eyebrow"><Sparkles size={15} /> SEU ASSISTENTE, A UM TOQUE</p>
          <h1>Leve o JARVIS<br /><span>com você.</span></h1>
          <p className="install-lede">Instale o app no celular ou computador para abrir mais rápido, usar tela cheia e falar com seu assistente em uma interface feita para cada dispositivo.</p>
          <div className="install-hero__actions">
            {promptEvent && <button type="button" className="install-primary" onClick={() => void install()}><Download size={18} /> Instalar neste dispositivo</button>}
            {platform === "desktop" && <><a className="install-primary" href="/downloads/JARVIS-Desktop-Setup-x64.exe" download><Download size={18} /> Baixar JARVIS Desktop para Windows</a><a className="install-secondary" href="/downloads/JARVIS-Desktop-Setup-x64.exe.sha256.txt" target="_blank" rel="noreferrer">Verificar SHA-256</a></>}
            {installed && <span className="install-success"><Check size={17} /> Instalado neste dispositivo</span>}
            <Link to="/login" className="install-secondary">Usar no navegador <ArrowRight size={16} /></Link>
          </div>
          {message && <p role="status" className="install-message">{message}</p>}
        </div>
        <div className="install-hero__visual" aria-hidden="true"><div className="install-orbit install-orbit--one" /><div className="install-orbit install-orbit--two" /><div className="install-device"><div className="install-device__top"><i /><i /><i /></div><div className="install-device__face"><span /><span /><b /></div><div className="install-device__wave"><i /><i /><i /><i /><i /><i /><i /></div><div className="install-device__caption">JARVIS · ONLINE</div></div><div className="install-spark install-spark--one" /><div className="install-spark install-spark--two" /></div>
      </section>
      <section className="install-options" aria-label="Opções de instalação">
        <article className={`install-option ${platform === "desktop" ? "install-option--selected" : ""}`}>
          <div className="install-option__icon"><Monitor size={22} /></div><div><p className="install-option__eyebrow">PARA PC</p><h2>Windows e computador</h2><p>Instalação pelo Chrome ou Edge, sem baixar arquivos de fontes desconhecidas. O app abre em janela própria e mantém seus dados protegidos pela sessão da sua conta.</p><ol>{platform === "desktop" ? steps.map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>) : <><li><span>1</span>Abra o JARVIS no Chrome ou Microsoft Edge.</li><li><span>2</span>Selecione Instalar JARVIS na barra de endereço ou no menu do navegador.</li><li><span>3</span>Confirme para adicionar ao menu Iniciar e à área de trabalho.</li></>}</ol></div>
        </article>
        <article className={`install-option ${platform === "android" ? "install-option--selected" : ""}`}>
          <div className="install-option__icon"><Smartphone size={22} /></div><div><p className="install-option__eyebrow">PARA ANDROID</p><h2>Seu assistente no celular</h2><p>Adicione o JARVIS à tela inicial e abra o modo de voz com um toque. O microfone só ativa quando você iniciar a conversa; não há escuta escondida.</p><ol>{platform === "android" ? steps.map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>) : <><li><span>1</span>Abra o JARVIS no Chrome do Android.</li><li><span>2</span>Toque em Instalar app ou no menu ⋮ e escolha Instalar app.</li><li><span>3</span>Coloque o ícone na tela inicial para acesso rápido à voz.</li></>}</ol></div>
        </article>
      </section>
      <section className="install-footer"><ShieldCheck size={19} /><p>O JARVIS é instalado diretamente pelo navegador. A instalação como app não concede acesso em segundo plano ao microfone nem substitui o assistente nativo do telefone.</p><a href="/manifest.webmanifest" target="_blank" rel="noreferrer" aria-label="Abrir manifesto do aplicativo"><ExternalLink size={16} /></a></section>
      <p className="install-note">Android e iPhone usam o PWA do navegador. Para Windows x64, o JARVIS Desktop oferece atalho global e ações locais confirmadas; o instalador não tem assinatura digital e o Windows pode exibir um aviso de editor desconhecido.</p>
    </main>
  );
}
