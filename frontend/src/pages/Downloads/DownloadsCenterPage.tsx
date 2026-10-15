import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, Check, Clipboard, Download, FileText, MonitorDown, PackageCheck, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

const officialBaseUrl = "https://jarvis.juninnzxtec.com.br";
const installerPath = "/downloads/JARVIS-Desktop-Setup-x64.exe";
const checksumPath = `${installerPath}.sha256.txt`;
const mobileInstallUrl = `${officialBaseUrl}/install`;
const installerSha256 = "0248fb9d25173d54b882c1d410c6964e174de00597971925db2b1d13e27d4291";

export function DownloadsCenterPage() {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(mobileInstallUrl, {
      width: 184,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#07111f", light: "#ffffff" }
    }).then((value) => {
      if (active) setQrDataUrl(value);
    }).catch(() => {
      if (active) setQrDataUrl("");
    });
    return () => { active = false; };
  }, []);

  async function copyLink(label: string, path: string) {
    try {
      await navigator.clipboard.writeText(`${officialBaseUrl}${path}`);
      setCopied(`${label} copiado.`);
    } catch {
      setCopied("Não foi possível copiar automaticamente. Abra o link oficial pelo botão de download.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="glass rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-200">JARVIS · DISTRIBUIÇÃO OFICIAL</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Central de Downloads</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Baixe apenas os artefatos verificados abaixo. O catálogo mostra claramente formato, arquitetura, assinatura e integridade; versões indisponíveis não têm botão ativo.</p>
        {copied && <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm text-cyan-100" role="status">{copied}</p>}
      </header>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Aplicativos disponíveis">
        <article className="glass flex flex-col rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><MonitorDown size={25} /></span>
              <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Aplicativo desktop</p><h2 className="text-xl font-black text-white">JARVIS para Windows</h2></div>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">Estável · 1.0.0</span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">Publicado</dt><dd className="mt-1 font-semibold text-slate-100">14/10/2026</dd></div>
            <div className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">Arquivo</dt><dd className="mt-1 font-semibold text-slate-100">EXE · Windows x64</dd></div>
            <div className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">Tamanho</dt><dd className="mt-1 font-semibold text-slate-100">111.131.660 bytes · 106 MiB</dd></div>
            <div className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">Assinatura digital</dt><dd className="mt-1 font-semibold text-amber-200">Não assinada</dd></div>
          </dl>

          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-sm text-amber-100">
            <p className="flex items-center gap-2 font-bold"><AlertTriangle size={17} /> Aviso de editor desconhecido</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/80">O SHA-256 permite conferir se o arquivo baixado corresponde ao publicado. Como não há certificado de assinatura, o Windows pode mostrar o SmartScreen.</p>
          </div>

          <div className="mt-4 rounded-xl bg-slate-950/50 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-300"><ShieldCheck size={15} /> SHA-256</p>
            <code className="mt-2 block break-all text-xs text-cyan-100">{installerSha256}</code>
            <a className="mt-2 inline-flex text-xs text-cyan-200 underline" href={checksumPath} target="_blank" rel="noreferrer">Abrir arquivo de checksum</a>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <a className="btn btn-primary" href={installerPath} download><Download size={17} /> Baixar instalador</a>
            <button className="btn btn-ghost" type="button" onClick={() => void copyLink("Link do Windows", installerPath)}><Clipboard size={16} /> Copiar link</button>
            <Link className="btn btn-ghost" to="/computer"><FileText size={16} /> Guia de uso</Link>
          </div>
        </article>

        <article className="glass flex flex-col rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Smartphone size={25} /></span>
              <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Aplicativo móvel</p><h2 className="text-xl font-black text-white">JARVIS para Android</h2></div>
            </div>
            <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-200">PWA disponível</span>
          </div>

          <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-2xl bg-slate-950/50 p-5 text-center">
            {qrDataUrl ? <img className="h-48 w-48 rounded-xl bg-white p-2" src={qrDataUrl} alt="QR code da página oficial de instalação do JARVIS" /> : <div className="grid h-48 w-48 place-items-center rounded-xl bg-white/5 text-slate-400"><QrCode size={48} /></div>}
            <p className="mt-3 max-w-sm text-sm text-slate-300">Escaneie com o celular para abrir o guia oficial e instalar o JARVIS como PWA pelo navegador.</p>
          </div>

          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-sm text-amber-100">
            <p className="flex items-center gap-2 font-bold"><PackageCheck size={17} /> APK/AAB não publicado</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/80">Não há pacote Android nativo assinado disponível. Use o PWA; não há botão para baixar um APK inexistente.</p>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <Link className="btn btn-primary" to="/install"><Smartphone size={17} /> Instruções para Android</Link>
            <button className="btn btn-ghost" type="button" onClick={() => void copyLink("Link de instalação", "/install")}><Clipboard size={16} /> Copiar link</button>
          </div>
        </article>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-bold text-white"><Check className="text-cyan-200" size={19} /> Sobre este catálogo</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Esta página lista os arquivos que existem e foram verificados no momento. Publicação administrativa de novas versões, histórico de releases, assinatura digital e distribuição por WhatsApp/e-mail ainda não estão habilitados nesta instalação.</p>
        <Link className="mt-3 inline-flex text-sm text-cyan-200 underline" to="/install">Ver a página geral de instalação</Link>
      </section>
    </main>
  );
}
