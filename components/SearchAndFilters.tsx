"use client";

import { Search, X } from "lucide-react";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type Currency,
  type ProductCondition,
  type ProjectStatus,
} from "@/lib/enterprise";

export type ConditionFilter = "all" | ProductCondition;
export type CurrencyFilter = "all" | Currency;
export type StatusFilter = "all" | ProjectStatus;

type SearchAndFiltersProps = {
  id: string;
  search: string;
  onSearchChange: (value: string) => void;
  condition: ConditionFilter;
  onConditionChange: (value: ConditionFilter) => void;
  currency: CurrencyFilter;
  onCurrencyChange: (value: CurrencyFilter) => void;
  status?: StatusFilter;
  onStatusChange?: (value: StatusFilter) => void;
  month?: string;
  onMonthChange?: (value: string) => void;
};

const selectClass =
  "h-10 min-w-36 rounded-lg border border-purple-500/20 bg-slate-900/50 px-3 text-sm text-slate-200 outline-none transition focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20";

export default function SearchAndFilters({
  id,
  search,
  onSearchChange,
  condition,
  onConditionChange,
  currency,
  onCurrencyChange,
  status,
  onStatusChange,
  month,
  onMonthChange,
}: SearchAndFiltersProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-purple-500/20 bg-slate-900/30 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:min-w-[220px] sm:flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          aria-label="Buscar por nombre o descripción"
          autoComplete="off"
          className="h-10 w-full rounded-lg border border-purple-500/20 bg-slate-950/70 pl-9 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
          id={`${id}-search`}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar proyectos o productos…"
          type="search"
          value={search}
        />
        {search && (
          <button
            aria-label="Limpiar búsqueda"
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-300"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-400">
        <span>Condición</span>
        <select
          aria-label="Filtrar por condición"
          className={selectClass}
          onChange={(event) => onConditionChange(event.target.value as ConditionFilter)}
          value={condition}
        >
          <option value="all">Todos</option>
          <option value="Nuevo">Solo nuevos</option>
          <option value="Usado">Solo usados</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-400">
        <span>Moneda</span>
        <select
          aria-label="Filtrar por moneda"
          className={selectClass}
          onChange={(event) => onCurrencyChange(event.target.value as CurrencyFilter)}
          value={currency}
        >
          <option value="all">Todas</option>
          <option value="Bs">Bolívares (Bs)</option>
          <option value="$">Dólares ($)</option>
        </select>
      </label>

      {status && onStatusChange && (
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span>Estado</span>
          <select
            aria-label="Filtrar por estado"
            className={selectClass}
            onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
            value={status}
          >
            <option value="all">Todos</option>
            {PROJECT_STATUSES.map((projectStatus) => (
              <option key={projectStatus} value={projectStatus}>
                {PROJECT_STATUS_LABELS[projectStatus]}
              </option>
            ))}
          </select>
        </label>
      )}

      {month !== undefined && onMonthChange && (
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span>Mes</span>
          <input
            aria-label="Filtrar por mes"
            className={selectClass}
            onChange={(event) => onMonthChange(event.target.value)}
            type="month"
            value={month}
          />
        </label>
      )}
    </div>
  );
}