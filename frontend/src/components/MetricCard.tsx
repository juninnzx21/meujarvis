import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export function MetricCard({ title, value, icon: Icon, tone = "cyan" }: { title: string; value: string | number; icon: LucideIcon; tone?: "cyan" | "blue" | "violet" }) {
  const toneClass = tone === "violet" ? "text-violetx" : tone === "blue" ? "text-electric" : "text-cyanx";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <strong className="mt-2 block text-2xl text-white">{value}</strong>
        </div>
        <div className={`rounded-2xl bg-white/5 p-3 ${toneClass}`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
