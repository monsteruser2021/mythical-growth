"use client";

import type { ProductCondition } from "@/lib/enterprise";

export default function ConditionBadge({ condition }: { condition: ProductCondition }) {
  const colors = condition === "Nuevo"
    ? "border-purple-400/25 bg-purple-400/10 text-purple-200"
    : "border-slate-500/30 bg-slate-500/10 text-slate-300";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors}`}>
      {condition}
    </span>
  );
}