"use client";

import { Archive, ChartNoAxesCombined, Coins, PackageOpen, TrendingUp } from "lucide-react";
import {
  formatMoney,
  type Currency,
  type EnterpriseProject,
} from "@/lib/enterprise";

type HistoryTabProps = {
  projects: EnterpriseProject[];
  allProjects: EnterpriseProject[];
  loading: boolean;
};

type TotalsByCurrency = Record<Currency, number>;

function splitCurrencyTotals(projects: EnterpriseProject[], value: (project: EnterpriseProject) => number): TotalsByCurrency {
  return projects.reduce<TotalsByCurrency>(
    (totals, project) => {
      totals[project.currency] += value(project);
      return totals;
    },
    { Bs: 0, "$": 0 },
  );
}

function CurrencyTotals({ totals }: { totals: TotalsByCurrency }) {
  return (
    <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold tabular-nums text-white">
      <span>{formatMoney(totals.Bs, "Bs")}</span>
      <span>{formatMoney(totals["$"], "$")}</span>
    </span>
  );
}

export default function HistoryTab({ projects, allProjects, loading }: HistoryTabProps) {
  const mobilized = splitCurrencyTotals(allProjects, (project) => project.purchaseTotal);
  const activeStock = splitCurrencyTotals(
    allProjects.filter((project) => project.status === "active"),
    (project) => project.availableUnits * project.unitCost,
  );
  const netProfit = splitCurrencyTotals(allProjects, (project) => project.netProfit);

  const indicators = [
    { label: "Capital movilizado histórico", icon: Coins, totals: mobilized },
    { label: "Inventario activo valorizado", icon: PackageOpen, totals: activeStock },
    { label: "Ganancia neta histórica", icon: TrendingUp, totals: netProfit },
  ];

  return (
    <section aria-labelledby="history-heading" className="py-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/15 text-purple-300">
          <Archive aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white" id="history-heading">Historial y liquidados</h2>
          <p className="mt-1 text-sm text-slate-400">Cierre de lotes y resultados financieros realizados.</p>
        </div>
      </div>

      <div className="mb-9 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
        {indicators.map(({ label, icon: Icon, totals }) => (
          <div className="bg-slate-950 p-5" key={label}>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Icon aria-hidden="true" className="size-4 text-purple-300" />
              {label}
            </div>
            <CurrencyTotals totals={totals} />
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-200">Lotes cerrados</h3>
        <span className="text-xs text-slate-500">{projects.length} registros</span>
      </div>

      {loading ? (
        <div className="border-y border-white/10 py-12 text-center text-sm text-slate-400">Cargando historial…</div>
      ) : projects.length === 0 ? (
        <div className="border-y border-white/10 py-12 text-center">
          <ChartNoAxesCombined aria-hidden="true" className="mx-auto size-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">Todavía no hay proyectos liquidados</p>
          <p className="mt-1 text-xs text-slate-500">Los lotes aparecerán aquí cuando se venda la última unidad.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10 border-y border-white/10">
          {projects.map((project) => {
            const profitability = project.capitalRecovered > 0
              ? (project.netProfit / project.capitalRecovered) * 100
              : 0;

            return (
              <article className="py-5" key={project.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-white">{project.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {project.condition} · {project.quantityPurchased} unidades · Inversión: {formatMoney(project.purchaseTotal, project.currency)}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                    Liquidado
                  </span>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-500">Capital recuperado</dt>
                    <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-200">
                      {formatMoney(project.capitalRecovered, project.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Ganancia neta</dt>
                    <dd className={`mt-1 text-sm font-semibold tabular-nums ${project.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatMoney(project.netProfit, project.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Rentabilidad real</dt>
                    <dd className={`mt-1 text-sm font-semibold tabular-nums ${profitability >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {profitability.toFixed(2)}%
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}