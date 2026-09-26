"use client";

import { AlertTriangle } from "lucide-react";

type StockBadgeProps = {
  availableUnits: number;
  threshold?: number;
};

export default function StockBadge({ availableUnits, threshold = 3 }: StockBadgeProps) {
  if (availableUnits > threshold) return null;

  const exhausted = availableUnits <= 0;
  const urgent = availableUnits <= 1;
  const colors = urgent
    ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
    : "border-amber-400/25 bg-amber-400/10 text-amber-200";

  return (
    <span
      aria-label={exhausted ? "Stock agotado" : `Stock crítico: quedan ${availableUnits} unidades`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${colors}`}
      role="status"
    >
      <AlertTriangle aria-hidden="true" className="size-3" />
      {exhausted ? "Agotado" : `Stock crítico · ${availableUnits}`}
    </span>
  );
}