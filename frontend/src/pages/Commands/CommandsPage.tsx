import { FormEvent, useEffect, useState } from "react";
import { Play } from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { api, friendlyError } from "../../services/api";

export function CommandsPage() {
  const [commands, setCommands] = useState<any[]>([]);
  const [phrase, setPhrase] = useState("status do sistema");
  const [result, setResult] = useState("");
  useEffect(() => { api.get("/commands").then((res) => setCommands(res.data.commands)); }, []);
  async function run(event: FormEvent) {
    event.preventDefault();
    try {
      const res = await api.post("/commands/run", { phrase });
      setResult(JSON.stringify(res.data, null, 2));
    } catch (error) {
      setResult(friendlyError(error));
    }
  }
  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Comandos</h2>
      <form onSubmit={run} className="glass flex flex-col gap-3 rounded-2xl p-4 md:flex-row">
        <input className="input" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
        <button className="btn btn-primary"><Play size={18} /> Testar</button>
      </form>
      {result && <pre className="glass overflow-auto rounded-2xl p-4 text-sm text-slate-200">{result}</pre>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {commands.map((command) => (
          <button key={command.id} onClick={() => setPhrase(command.example)} className="glass rounded-2xl p-4 text-left">
            <div className="mb-3 flex items-center justify-between gap-3"><strong className="text-white">{command.title}</strong><StatusPill status={command.safety} /></div>
            <p className="text-sm text-slate-400">{command.example}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
