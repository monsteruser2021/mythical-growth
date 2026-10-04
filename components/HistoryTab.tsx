"use client";

import { Archive, ChartNoAxesCombined, Coins, PackageOpen, TrendingUp } from "lucide-react";
import {
  formatMoney,
  type Currency,
  type EnterpriseProject,
  type SaleRecord,
} from "@/lib/enterprise";
import ExportExcelButton from "@/components/ExportExcelButton";
import type { ExcelColumn } from "@/lib/exportExcel";
import SearchAndFilters, {
  type ConditionFilter,
  type CurrencyFilter,
} from "@/components/SearchAndFilters";
import { useMemo, useState } from "react";
import ProfitBadge from "@/components/ProfitBadge";
import ConditionBadge from "@/components/ConditionBadge";

type HistoryTabProps = {
  projects: EnterpriseProject[];
  allProjects: EnterpriseProject[];
  sales: SaleRecord[];
  salesLoading: boolean;
  salesError: string;
  loading: boolean;
  onExportSuccess: () => void;
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

const salesExcelColumns: ExcelColumn<SaleRecord>[] = [
  { header: "Nombre", value: (sale) => sale.projectName, width: 32 },
  { header: "Condición", value: (sale) => sale.condition ?? "" },
  { header: "Unidades Vendidas", value: (sale) => sale.quantity, numberFormat: "#,##0" },
  { header: "Costo Unitario", value: (sale) => sale.unitCost, numberFormat: (sale) => sale.currency === "Bs" ? '"Bs" #,##0.00' : '"$" #,##0.00' },
  { header: "Precio de Venta", value: (sale) => sale.unitPrice, numberFormat: (sale) => sale.currency === "Bs" ? '"Bs" #,##0.00' : '"$" #,##0.00' },
  { header: "Capital Recuperado", value: (sale) => sale.capitalRecovered, numberFormat: (sale) => sale.currency === "Bs" ? '"Bs" #,##0.00' : '"$" #,##0.00' },
  { header: "Ganancia Neta", value: (sale) => sale.netProfit, numberFormat: (sale) => sale.currency === "Bs" ? '"Bs" #,##0.00' : '"$" #,##0.00' },
  { header: "Moneda", value: (sale) => sale.currency, width: 12 },
  { header: "Fecha", value: (sale) => sale.soldAt ?? "", numberFormat: "dd/mm/yyyy hh:mm", width: 22 },
];

export default function HistoryTab({
  projects,
  allProjects,
  sales,
  salesLoading,
  salesError,
  loading,
  onExportSuccess,
}: HistoryTabProps) {
  const mobilized = splitCurrencyTotals(
    allProjects.filter((project) => project.status === "purchased" || project.status === "liquidation"),
    (project) => project.purchaseTotal,
  );
  const activeStock = splitCurrencyTotals(
    allProjects.filter((project) => project.status === "purchased"),
    (project) => project.availableUnits * project.unitCost,
  );
  const netProfit = splitCurrencyTotals(allProjects, (project) => project.netProfit);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState<ConditionFilter>("all");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");
  const [month, setMonth] = useState("");
  const matchingSales = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    return sales.filter((sale) => {
      const matchesSearch = !normalizedSearch || sale.projectName.toLocaleLowerCase("es").includes(normalizedSearch);
      const matchesCondition = condition === "all" || sale.condition === condition;
      const matchesCurrency = currency === "all" || sale.currency === currency;
      const matchesMonth = !month || sale.soldAt?.toISOString().slice(0, 7) === month;
      return matchesSearch && matchesCondition && matchesCurrency && matchesMonth;
    });
  }, [condition, currency, month, sales, search]);
  const latestSaleByProject = useMemo(() => {
    const latest = new Map<string, SaleRecord>();
    for (const sale of sales) {
      const current = latest.get(sale.projectId);
      if (!current || (sale.soldAt?.getTime() ?? 0) > (current.soldAt?.getTime() ?? 0)) {
        latest.set(sale.projectId, sale);
      }
    }
    return latest;
  }, [sales]);
  const matchingProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    return projects.filter((project) => {
      const matchesSearch = !normalizedSearch || project.name.toLocaleLowerCase("es").includes(normalizedSearch);
      const matchesCondition = condition === "all" || project.condition === condition;
      const matchesCurrency = currency === "all" || project.currency === currency;
      const closingSale = latestSaleByProject.get(project.id);
      const matchesMonth = !month || closingSale?.soldAt?.toISOString().slice(0, 7) === month;
      return matchesSearch && matchesCondition && matchesCurrency && matchesMonth;
    });
  }, [condition, currency, latestSaleByProject, month, projects, search]);

  const indicators = [
    { label: "Capital movilizado histórico", icon: Coins, totals: mobilized },
    { label: "Inventario activo valorizado", icon: PackageOpen, totals: activeStock },
    { label: "Ganancia neta histórica", icon: TrendingUp, totals: netProfit },
  ];

  return (
    <section aria-labelledby="history-heading" className="py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/15 text-purple-300">
            <Archive aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white" id="history-heading">Historial y liquidados</h2>
            <p className="mt-1 text-sm text-slate-400">Cierre de lotes y resultados financieros realizados.</p>
          </div>
        </div>
        <ExportExcelButton
          columns={salesExcelColumns}
          disabled={salesLoading || Boolean(salesError)}
          disabledLabel={salesError ? "Ventas no disponibles" : undefined}
          filenamePrefix="mythical-growth-historial-ventas"
          label="Exportar historial de ventas (Excel)"
          onSuccess={onExportSuccess}
          rows={matchingSales}
          sheetName="Historial de ventas"
        />
      </div>
      {salesError && (
        <p className="mb-5 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200" role="alert">
          {salesError}
        </p>
      )}
      <SearchAndFilters
        condition={condition}
        currency={currency}
        id="history"
        month={month}
        onConditionChange={setCondition}
        onCurrencyChange={setCurrency}
        onMonthChange={setMonth}
        onSearchChange={setSearch}
        search={search}
      />

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
        <span className="text-xs text-slate-500">{matchingProjects.length} de {projects.length} registros</span>
      </div>

      {loading ? (
        <div className="border-y border-white/10 py-12 text-center text-sm text-slate-400">Cargando historial…</div>
      ) : projects.length === 0 ? (
        <div className="border-y border-white/10 py-12 text-center">
          <ChartNoAxesCombined aria-hidden="true" className="mx-auto size-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">Todavía no hay proyectos liquidados</p>
          <p className="mt-1 text-xs text-slate-500">Los lotes aparecerán aquí cuando se venda la última unidad.</p>
        </div>
      ) : matchingProjects.length === 0 ? (
        <div className="border-y border-white/10 py-12 text-center">
          <p className="text-sm font-medium text-slate-300">No se encontraron resultados para los filtros seleccionados</p>
          <button
            className="mt-3 text-xs font-medium text-purple-300 hover:text-purple-200"
            onClick={() => { setSearch(""); setCondition("all"); setCurrency("all"); setMonth(""); }}
            type="button"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/10 border-y border-white/10">
          {matchingProjects.map((project) => {
            const profitability = project.capitalRecovered > 0
              ? (project.netProfit / project.capitalRecovered) * 100
              : 0;

            return (
              <article className="py-5" key={project.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-white">{project.name}</h4>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ConditionBadge condition={project.condition} />
                      <span className="text-xs text-slate-500">
                        {project.quantityPurchased} unidades · Inversión: {formatMoney(project.purchaseTotal, project.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                      Liquidado
                    </span>
                    <ProfitBadge capitalRecovered={project.capitalRecovered} netProfit={project.netProfit} />
                  </div>
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

      <div className="mt-9">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-200">Ventas registradas</h3>
          <span className="text-xs text-slate-500">{matchingSales.length} de {sales.length}</span>
        </div>
        {salesLoading ? (
          <p className="border-y border-white/10 py-6 text-center text-sm text-slate-400">Cargando ventas…</p>
        ) : matchingSales.length === 0 ? (
          <p className="border-y border-white/10 py-6 text-center text-sm text-slate-500">
            {sales.length === 0 ? "Todavía no hay ventas registradas." : "No se encontraron ventas para los filtros seleccionados."}
          </p>
        ) : (
          <div className="divide-y divide-white/10 border-y border-white/10">
            {matchingSales.map((sale) => (
              <article className="flex flex-wrap items-center justify-between gap-3 py-4" key={sale.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-white">{sale.projectName}</h4>
                    {sale.condition && <ConditionBadge condition={sale.condition} />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {sale.quantity} unidades · {formatMoney(sale.unitPrice, sale.currency)} por unidad · {sale.soldAt ? new Intl.DateTimeFormat("es-VE", { dateStyle: "medium" }).format(sale.soldAt) : "Fecha pendiente"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-slate-200">
                    {formatMoney(sale.netProfit, sale.currency)}
                  </span>
                  <ProfitBadge capitalRecovered={sale.capitalRecovered} netProfit={sale.netProfit} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}