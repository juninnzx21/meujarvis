import { useEffect, useState } from "react";
import { api } from "../../services/api";

const endpoints = [
  ["Resumo do dia", "/reports/daily-summary"],
  ["Tarefas", "/reports/tasks"],
  ["Sistema", "/reports/system"],
  ["Atividade", "/reports/activity"]
];

export function ReportsPage() {
  const [reports, setReports] = useState<Record<string, any>>({});
  useEffect(() => {
    Promise.all(endpoints.map(([label, url]) => api.get(url).then((res) => [label, res.data]))).then((items) => setReports(Object.fromEntries(items)));
  }, []);
  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-white">Relatorios</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        {endpoints.map(([label]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <h3 className="mb-3 font-bold text-white">{label}</h3>
            <pre className="max-h-96 overflow-auto text-sm text-slate-300">{JSON.stringify(reports[label] || {}, null, 2)}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
