"use client";

import { AlertTriangle, Boxes, CircleDollarSign, PackageCheck, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatMoney,
  type EnterpriseProject,
  type SaleInput,
} from "@/lib/enterprise";
import SearchAndFilters, {
  type ConditionFilter,
  type CurrencyFilter,
} from "@/components/SearchAndFilters";
import StockBadge from "@/components/StockBadge";
import ConditionBadge from "@/components/ConditionBadge";

type InventoryTabProps = {
  projects: EnterpriseProject[];
  loading: boolean;
  onSell: (project: EnterpriseProject, sale: SaleInput) => Promise<void>;
};

export default function InventoryTab({ projects, loading, onSell }: InventoryTabProps) {
  const [selectedProject, setSelectedProject] = useState<EnterpriseProject | null>(null);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState<ConditionFilter>("all");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");
  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    return projects.filter((project) => {
      const matchesSearch = !normalizedSearch || project.name.toLocaleLowerCase("es").includes(normalizedSearch);
      const matchesCondition = condition === "all" || project.condition === condition;
      const matchesCurrency = currency === "all" || project.currency === currency;
      return matchesSearch && matchesCondition && matchesCurrency;
    });
  }, [condition, currency, projects, search]);

  return (
    <section aria-labelledby="inventory-heading" className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/15 text-purple-300">
            <Boxes aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white" id="inventory-heading">
              Inventario activo
            </h2>
            <p className="mt-1 text-sm text-slate-400">Stock actualizado en tiempo real.</p>
          </div>
        </div>
        <span className="text-sm text-slate-500">
          {filteredProjects.length} de {projects.length} {projects.length === 1 ? "lote activo" : "lotes activos"}
        </span>
      </div>

      <SearchAndFilters
        condition={condition}
        currency={currency}
        id="inventory"
        onConditionChange={setCondition}
        onCurrencyChange={setCurrency}
        onSearchChange={setSearch}
        search={search}
      />

      {loading ? (
        <div className="border-y border-white/10 py-12 text-center text-sm text-slate-400">
          Cargando inventario…
        </div>
      ) : projects.length === 0 ? (
        <div className="border-y border-white/10 py-14 text-center">
          <PackageCheck aria-hidden="true" className="mx-auto size-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">No hay lotes con stock disponible</p>
          <p className="mt-1 text-xs text-slate-500">Los proyectos activados aparecerán aquí.</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="border-y border-white/10 py-12 text-center">
          <p className="text-sm font-medium text-slate-300">No se encontraron resultados para los filtros seleccionados</p>
          <button
            className="mt-3 text-xs font-medium text-purple-300 hover:text-purple-200"
            onClick={() => { setSearch(""); setCondition("all"); setCurrency("all"); }}
            type="button"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/10 border-y border-white/10">
          {filteredProjects.map((project) => (
            <article className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={project.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="truncate font-medium text-white">{project.name}</h3>
                  <ConditionBadge condition={project.condition} />
                  <StockBadge availableUnits={project.availableUnits} />
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Stock: <strong className="font-semibold text-slate-200">{project.availableUnits}</strong> / {project.quantityPurchased} unidades disponibles
                </p>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                  <span>Costo unitario: <strong className="font-medium text-slate-300">{formatMoney(project.unitCost, project.currency)}</strong></span>
                  <span>Precio de venta: <strong className="font-medium text-slate-300">{formatMoney(project.salePriceUnit, project.currency)}</strong></span>
                </div>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-purple-500/30 px-4 text-sm font-medium text-purple-200 transition-colors hover:border-purple-400/60 hover:bg-purple-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300"
                onClick={() => setSelectedProject(project)}
                type="button"
              >
                <CircleDollarSign aria-hidden="true" className="size-4" />
                Registrar venta
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedProject && (
        <SaleModal
          key={selectedProject.id}
          onClose={() => setSelectedProject(null)}
          onSell={onSell}
          project={selectedProject}
        />
      )}
    </section>
  );
}

function SaleModal({
  project,
  onClose,
  onSell,
}: {
  project: EnterpriseProject;
  onClose: () => void;
  onSell: InventoryTabProps["onSell"];
}) {
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(String(project.salePriceUnit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const parsedQuantity = Number(quantity);
  const parsedPrice = Number(unitPrice);
  const estimatedProfit = Number.isInteger(parsedQuantity) && parsedPrice > 0
    ? (parsedPrice - project.unitCost) * parsedQuantity
    : 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > project.availableUnits) {
      setError(`Indica una cantidad entera entre 1 y ${project.availableUnits}.`);
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("El precio unitario debe ser mayor que cero.");
      return;
    }

    setSaving(true);
    try {
      await onSell(project, { quantity: parsedQuantity, unitPrice: parsedPrice });
      onClose();
    } catch (saleError) {
      setError(saleError instanceof Error ? saleError.message : "No se pudo registrar la venta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        aria-labelledby="sale-modal-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-purple-500/20 bg-slate-950 p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-purple-300">Venta rápida</p>
            <h3 className="mt-1 text-lg font-semibold text-white" id="sale-modal-title">{project.name}</h3>
            <p className="mt-1 text-sm text-slate-400">Disponibles: {project.availableUnits} unidades</p>
          </div>
          <button
            aria-label="Cerrar modal"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-300"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="sale-quantity">Unidades a vender</label>
            <input
              autoFocus
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-600/25"
              id="sale-quantity"
              max={project.availableUnits}
              min="1"
              onChange={(event) => setQuantity(event.target.value)}
              required
              step="1"
              type="number"
              value={quantity}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="sale-price-unit">Precio real por unidad ({project.currency})</label>
            <input
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-600/25"
              id="sale-price-unit"
              min="0.01"
              onChange={(event) => setUnitPrice(event.target.value)}
              required
              step="0.01"
              type="number"
              value={unitPrice}
            />
          </div>

          <div className="flex items-start justify-between gap-3 border-y border-white/10 py-3 text-sm">
            <span className="text-slate-400">Ganancia estimada</span>
            <span className={`text-right font-semibold tabular-nums ${estimatedProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {formatMoney(estimatedProfit, project.currency)}
            </span>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200" role="alert">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            className="h-11 w-full rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? "Registrando…" : "Confirmar venta"}
          </button>
        </form>
      </section>
    </div>
  );
}