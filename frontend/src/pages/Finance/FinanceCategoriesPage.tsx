import { FormEvent, useEffect, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { api, friendlyError } from "../../services/api";

type Category = { id: string; name: string; type: string; keywords: string[]; isDefault: boolean };

export function FinanceCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", type: "expense", keywords: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await api.get("/finance/categories");
    setCategories(res.data.categories);
  }

  useEffect(() => { load().catch((error) => setMessage(friendlyError(error))); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/finance/categories", { ...form, keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean) });
      setForm({ name: "", type: "expense", keywords: "" });
      await load();
      setMessage("Categoria criada.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-3 text-3xl font-black text-white"><ListChecks className="text-cyanx" /> Categorias financeiras</h2>
        <p className="text-slate-400">Categorias padrão, palavras-chave e base para regras automáticas.</p>
        {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-slate-300">{message}</p>}
      </div>
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-5">
          <h3 className="font-bold text-white">Nova categoria</h3>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
            <option value="transfer">Transferência</option>
            <option value="adjustment">Ajuste</option>
          </select>
          <input className="input" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="Palavras-chave separadas por vírgula" />
          <button className="btn btn-primary"><Plus size={18} /> Criar</button>
        </form>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="glass rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{cat.type}</p>
              <h3 className="font-black text-white">{cat.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{cat.keywords.join(", ") || "Sem palavras-chave"}</p>
              {cat.isDefault && <span className="mt-3 inline-block rounded-full bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">padrão</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
