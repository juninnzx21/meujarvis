export function StatusPill({ status }: { status?: string | boolean }) {
  const ok = status === true || status === "ok" || status === "configurado" || status === "configured" || status === "success";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${ok ? "bg-cyan-400/15 text-cyan-200" : "bg-amber-400/15 text-amber-200"}`}>
      {ok ? "operacional" : String(status ?? "pendente")}
    </span>
  );
}
