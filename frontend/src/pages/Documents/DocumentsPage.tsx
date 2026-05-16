import { FormEvent, useEffect, useState } from "react";
import { FileText, Search, Upload } from "lucide-react";
import { api, friendlyError } from "../../services/api";

export function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [result, setResult] = useState("");
  const [search, setSearch] = useState("");
  const [chunks, setChunks] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", fileName: "", fileType: "md", content: "" });

  async function load() {
    const res = await api.get("/documents");
    setDocuments(res.data.documents || []);
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function upload(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/documents/upload", { ...form, source: "manual" });
      setResult("Documento registrado com seguranca.");
      setForm({ title: "", fileName: "", fileType: "md", content: "" });
      await load();
    } catch (error) {
      setResult(friendlyError(error));
    }
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const res = await api.get(`/documents/search?q=${encodeURIComponent(search)}`);
    setChunks(res.data.chunks || []);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={upload} className="glass space-y-4 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx"><FileText /></div>
          <div>
            <h2 className="text-3xl font-black text-white">Documentos</h2>
            <p className="text-slate-400">RAG seguro preparado: uploads locais, busca redigida e sem envio automatico para IA externa.</p>
          </div>
        </div>
        <input className="input" placeholder="Titulo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="arquivo.md" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          <select className="input" value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })}>
            <option value="md">MD</option>
            <option value="txt">TXT</option>
            <option value="csv">CSV</option>
            <option value="ofx">OFX</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        <textarea className="input min-h-40" placeholder="Conteudo textual para indexar nesta fase" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <button className="btn btn-primary"><Upload size={18} /> Registrar documento</button>
        {result && <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{result}</p>}
      </form>

      <div className="space-y-5">
        <form onSubmit={runSearch} className="glass flex flex-wrap gap-3 rounded-2xl p-4">
          <input className="input min-w-64 flex-1" placeholder="Buscar em documentos" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-ghost"><Search size={18} /> Buscar</button>
        </form>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold text-white">Documentos recentes</h3>
          <div className="space-y-2">
            {documents.map((doc) => <div key={doc.id} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{doc.title} <span className="text-slate-500">({doc.fileType})</span></div>)}
            {!documents.length && <p className="text-sm text-slate-400">Nenhum documento registrado.</p>}
          </div>
        </div>
        {!!chunks.length && (
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 font-bold text-white">Resultados</h3>
            <div className="space-y-2">
              {chunks.map((chunk) => <p key={chunk.id} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{chunk.content}</p>)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
