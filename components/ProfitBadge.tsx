import { Minus, TrendingDown, TrendingUp } from "lucide-react";

type ProfitBadgeProps = {
  netProfit: number;
  capitalRecovered: number;
  highThreshold?: number;
  lowThreshold?: number;
};

export default function ProfitBadge({
  netProfit,
  capitalRecovered,
  highThreshold = 30,
  lowThreshold = 10,
}: ProfitBadgeProps) {
  const margin = capitalRecovered > 0 ? (netProfit / capitalRecovered) * 100 : 0;
  const isHigh = margin > highThreshold;
  const isLow = margin < lowThreshold;
  const Icon = isHigh ? TrendingUp : isLow ? TrendingDown : Minus;
  const label = isHigh ? "Alta rentabilidad" : isLow ? "Margen bajo" : "Rentabilidad estándar";
  const colors = isHigh
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
    : isLow
      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
      : "border-slate-500/30 bg-slate-500/10 text-slate-300";

  return (
    <span
      aria-label={`${label}: ${margin.toFixed(1)}%`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors}`}
      title={`Margen: ${margin.toFixed(2)}%`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span>{label} · {margin.toFixed(1)}%</span>
    </span>
  );
}