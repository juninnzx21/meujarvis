import { Sparkles } from "lucide-react";

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="glass rounded-2xl p-8 text-center text-slate-300">
      <Sparkles className="mx-auto mb-3 text-cyanx" />
      <p>{title}</p>
    </div>
  );
}
