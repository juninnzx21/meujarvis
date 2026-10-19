export function StatusPill({ status }: { status?: string | boolean }) {
  const ok = status === true || status === "ok" || status === "success" || status === "connected" || status === "online";
  const configured = status === "configurado" || status === "configured";
  const labels: Record<string, string> = {
    connected: "conectado",
    online: "online",
    disconnected: "desconectado",
    connecting: "conectando",
    unknown: "não verificado",
    degraded: "atenção",
    not_configured: "não configurado",
    configurado: "configurado",
    configured: "configurado",
    success: "operacional",
    ok: "operacional"
  };
  const label = typeof status === "string" ? labels[status] || status : status === true ? "operacional" : "pendente";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${ok ? "bg-cyan-400/15 text-cyan-200" : configured ? "bg-sky-400/15 text-sky-200" : "bg-amber-400/15 text-amber-200"}`}>
      {label}
    </span>
  );
}
