"use client";

import { Calculator, CircleDollarSign, PackagePlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  formatMoney,
  toMinorUnits,
  type Currency,
  type EnterpriseProject,
  type ProductCondition,
  type ProjectDraft,
} from "@/lib/enterprise";
import SearchAndFilters, {
  type ConditionFilter,
  type CurrencyFilter,
  type StatusFilter,
} from "@/components/SearchAndFilters";

type ProjectsTabProps = {
  projects: EnterpriseProject[];
  loading: boolean;
  onCreate: (project: ProjectDraft) => Promise<void>;
};

export default function ProjectsTab({ projects, loading, onCreate }: ProjectsTabProps) {
  const [name, setName] = useState("");
  const [purchaseTotal, setPurchaseTotal] = useState("");
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("Bs");
  const [condition, setCondition] = useState<ProductCondition>("Nuevo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCondition, setFilterCondition] = useState<ConditionFilter>("all");
  const [filterCurrency, setFilterCurrency] = useState<CurrencyFilter>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  const unitCost = useMemo(() => {
    const total = Number(purchaseTotal);
    const units = Number(quantity);
    return total > 0 && units > 0 ? total / units : 0;
  }, [purchaseTotal, quantity]);
  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    return projects.filter((project) => {
      const matchesSearch = !normalizedSearch || project.name.toLocaleLowerCase("es").includes(normalizedSearch);
      const matchesCondition = filterCondition === "all" || project.condition === filterCondition;
      const matchesCurrency = filterCurrency === "all" || project.currency === filterCurrency;
      const matchesStatus = filterStatus === "all" || project.status === filterStatus;
      return matchesSearch && matchesCondition && matchesCurrency && matchesStatus;
    });
  }, [filterCondition, filterCurrency, filterStatus, projects, search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const total = Number(purchaseTotal);
    const units = Number(quantity);
    const price = Number(salePrice);
    const totalMinor = toMinorUnits(total);
    const priceMinor = toMinorUnits(price);

    if (!name.trim() || !Number.isFinite(total) || total <= 0 || !Number.isSafeInteger(totalMinor) || totalMinor < 1) {
      setError("Escribe un nombre y un costo total mayor que cero.");
      return;
    }
    if (!Number.isInteger(units) || units < 1) {
      setError("La cantidad debe ser un número entero de al menos una unidad.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(priceMinor) || priceMinor < 1) {
      setError("Define un precio de venta unitario mayor que cero.");
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        purchaseTotal: total,
        currency,
        condition,
        quantityPurchased: units,
        salePriceUnit: price,
      });
      setName("");
      setPurchaseTotal("");
      setQuantity("");
      setSalePrice("");
      setCurrency("Bs");
      setCondition("Nuevo");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo guardar el proyecto. Revisa la conexión e inténtalo otra vez.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-600/25";
  const labelClass = "mb-2 block text-sm font-medium text-slate-300";

  return (
    <section aria-labelledby="projects-heading" className="py-8">
      <div className="mb-7 flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/15 text-purple-300">
          <PackagePlus aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white" id="projects-heading">
            Proyectos y pipeline
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Registra una adquisición y activa su lote en el inventario.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-200">Lotes registrados</h3>
          <span className="text-xs text-slate-500">{filteredProjects.length} de {projects.length}</span>
        </div>
        <SearchAndFilters
          condition={filterCondition}
          currency={filterCurrency}
          id="pipeline"
          onConditionChange={setFilterCondition}
          onCurrencyChange={setFilterCurrency}
          onSearchChange={setSearch}
          onStatusChange={setFilterStatus}
          search={search}
          status={filterStatus}
        />
        {loading ? (
          <p className="border-y border-white/10 py-6 text-center text-sm text-slate-400">Cargando proyectos…</p>
        ) : projects.length === 0 ? (
          <p className="border-y border-white/10 py-6 text-center text-sm text-slate-400">Todavía no hay proyectos registrados.</p>
        ) : filteredProjects.length === 0 ? (
          <p className="border-y border-white/10 py-6 text-center text-sm text-slate-400">No se encontraron resultados para los filtros seleccionados.</p>
        ) : (
          <div className="divide-y divide-white/10 border-y border-white/10">
            {filteredProjects.map((project) => (
              <article className="flex flex-wrap items-center justify-between gap-3 py-4" key={project.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-white">{project.name}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${project.condition === "Nuevo" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                      {project.condition}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {project.availableUnits}/{project.quantityPurchased} unidades · {formatMoney(project.purchaseTotal, project.currency)}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${project.status === "active" ? "border-purple-400/20 text-purple-200" : "border-slate-600 text-slate-400"}`}>
                  {project.status === "active" ? "Activo" : "Liquidado"}
                </span>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 border-t border-white/10 pt-7">
        <h3 className="text-base font-semibold text-white">Registrar oportunidad o lote</h3>
        <p className="mt-1 text-sm text-slate-400">El lote se activará en inventario al guardar.</p>
      </div>

      <form className="max-w-3xl" onSubmit={handleSubmit}>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="project-name">
              Proyecto o producto
            </label>
            <input
              autoComplete="off"
              className={inputClass}
              id="project-name"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Lote de accesorios"
              required
              value={name}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="purchase-total">
              Costo total de adquisición
            </label>
            <input
              className={inputClass}
              id="purchase-total"
              min="0.01"
              onChange={(event) => setPurchaseTotal(event.target.value)}
              placeholder="0,00"
              required
              step="0.01"
              type="number"
              value={purchaseTotal}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="currency">
              Moneda de adquisición
            </label>
            <select
              className={inputClass}
              id="currency"
              onChange={(event) => setCurrency(event.target.value as Currency)}
              value={currency}
            >
              <option value="Bs">Bolívares (Bs)</option>
              <option value="$">Dólares ($)</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="condition">
              Condición del artículo
            </label>
            <select
              className={inputClass}
              id="condition"
              onChange={(event) => setCondition(event.target.value as ProductCondition)}
              value={condition}
            >
              <option value="Nuevo">Nuevo</option>
              <option value="Usado">Usado</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="quantity">
              Unidades compradas
            </label>
            <input
              className={inputClass}
              id="quantity"
              min="1"
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="1"
              required
              step="1"
              type="number"
              value={quantity}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="sale-price">
              Precio de venta unitario
            </label>
            <input
              className={inputClass}
              id="sale-price"
              min="0.01"
              onChange={(event) => setSalePrice(event.target.value)}
              placeholder="0,00"
              required
              step="0.01"
              type="number"
              value={salePrice}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Calculator aria-hidden="true" className="size-4 text-purple-300" />
            <span className="text-sm text-slate-400">Costo unitario calculado</span>
          </div>
          <span className="text-lg font-semibold tabular-nums text-white">
            {formatMoney(unitCost, currency)}
            <span className="ml-1 text-xs font-normal text-slate-500">/ unidad</span>
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <CircleDollarSign aria-hidden="true" className="size-4" />
            El lote se activa inmediatamente al guardarlo.
          </p>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? "Guardando…" : "Guardar y activar proyecto"}
          </button>
        </div>
      </form>
    </section>
  );
}