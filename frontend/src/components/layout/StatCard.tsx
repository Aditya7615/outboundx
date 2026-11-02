import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "blue"
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accent?: "blue" | "green" | "amber" | "slate";
}) {
  const accents = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200"
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border",
            accents[accent]
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
