import { NavLink, Outlet } from "react-router-dom";
import { Activity, Banknote, Bell, Bot, Brain, Cable, FileText, Gauge, Home, Landmark, ListChecks, ListTodo, LogOut, Menu, MessageSquare, Mic, PieChart, PlaySquare, ScrollText, Settings, Share2, Smartphone, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

const items = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/mobile-assistant", label: "Assistente Mobile", icon: Smartphone },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/voice", label: "Voz", icon: Mic },
  { to: "/commands", label: "Comandos", icon: PlaySquare },
  { to: "/routines", label: "Rotinas", icon: Activity },
  { to: "/reports", label: "Relatorios", icon: ScrollText },
  { to: "/documents", label: "Documentos", icon: FileText },
  { to: "/integrations", label: "Integracoes", icon: Cable },
  { to: "/finance", label: "Financeiro", icon: WalletCards },
  { to: "/finance/accounts", label: "Contas", icon: Landmark },
  { to: "/finance/transactions", label: "Lancamentos", icon: Banknote },
  { to: "/finance/categories", label: "Categorias", icon: ListChecks },
  { to: "/finance/import", label: "Importar Extrato", icon: FileText },
  { to: "/finance/reports", label: "Relatorios Financeiros", icon: PieChart },
  { to: "/notifications", label: "Notificacoes", icon: Bell },
  { to: "/automations", label: "Automacoes", icon: Share2 },
  { to: "/memory", label: "Memoria", icon: Brain },
  { to: "/tasks", label: "Tarefas", icon: ListTodo },
  { to: "/n8n", label: "n8n", icon: Share2 },
  { to: "/whatsapp", label: "WhatsApp", icon: Smartphone },
  { to: "/smart-home", label: "Casa Inteligente", icon: Home },
  { to: "/settings", label: "Configuracoes", icon: Settings },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/status", label: "Status", icon: Activity }
];

const mobileItems = [
  { to: "/", label: "Inicio", icon: Gauge },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/voice", label: "Voz", icon: Mic },
  { to: "/finance", label: "Financeiro", icon: WalletCards },
  { to: "/notifications", label: "Avisos", icon: Bell }
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  useEffect(() => {
    api.get("/notifications?unread=true")
      .then((res) => setUnreadCount(res.data.unreadCount ?? 0))
      .catch(() => setUnreadCount(0));
  }, []);
  return (
    <div className="min-h-screen pb-20 lg:flex lg:pb-0">
      <aside className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-white/10 bg-slate-950/95 p-5 lg:static lg:block`}>
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400/15 text-cyanx"><Bot /></div>
          <div>
            <h1 className="font-black text-white">JARVIS Home AI</h1>
            <p className="text-xs text-slate-400">Casa, rotina e automacoes</p>
          </div>
        </div>
        <nav className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-cyan-400/15 text-cyan-100" : "text-slate-300 hover:bg-white/5"}`}>
              <Icon size={18} /> {label}
              {to === "/notifications" && unreadCount > 0 && <span className="ml-auto rounded-full bg-cyan-400 px-2 py-0.5 text-xs font-black text-slate-950">{unreadCount}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur lg:px-8 lg:py-4">
          <div className="flex items-center justify-between">
            <button className="btn btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={18} /></button>
            <div className="min-w-0">
              <p className="hidden text-sm text-slate-400 sm:block">Seu assistente inteligente para casa, rotina e automacoes.</p>
              <strong className="block truncate text-white">{user?.name}</strong>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100 sm:flex"><Activity size={14} /> online</span>
              {unreadCount > 0 && <NavLink to="/notifications" className="relative rounded-xl bg-white/5 p-2 text-cyan-100"><Bell size={18} /><span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 text-[10px] font-black text-slate-950">{unreadCount}</span></NavLink>}
              <button className="btn btn-ghost" onClick={logout}><LogOut size={18} /></button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold ${isActive ? "bg-cyan-400/15 text-cyan-100" : "text-slate-400"}`}>
              <Icon size={19} />
              <span className="mt-1 max-w-full truncate">{label}</span>
              {to === "/notifications" && unreadCount > 0 && <span className="absolute mt-[-2rem] ml-8 rounded-full bg-cyan-400 px-1.5 text-[10px] font-black text-slate-950">{unreadCount}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
      <PwaInstallPrompt />
    </div>
  );
}
