"use client";

import {
  ArchiveX,
  Calculator,
  CircleDollarSign,
  PackagePlus,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  formatMoney,
  PROJECT_STATUS_LABELS,
  toMinorUnits,
  type Currency,
  type EnterpriseProject,
  type ProjectEditInput,
  type ProductCondition,
  type ProjectDraft,
} from "@/lib/enterprise";
import SearchAndFilters, {
  type ConditionFilter,
  type CurrencyFilter,
  type StatusFilter,
} from "@/components/SearchAndFilters";
import PaginationControls, { usePagination } from "@/components/PaginationControls";

type ProjectsTabProps = {
  projects: EnterpriseProject[];
  loading: boolean;
  onCreate: (project: ProjectDraft) => Promise<void>;
  onAcquire: (project: EnterpriseProject) => Promise<void>;
  onDiscard: (project: EnterpriseProject) => Promise<void>;
  onEdit: (project: EnterpriseProject, input: ProjectEditInput) => Promise<void>;
  onDelete: (project: EnterpriseProject) => Promise<void>;
};

export default function ProjectsTab({
  projects,
  loading,
  onCreate,
  onAcquire,
  onDiscard,
  onEdit,
  onDelete,
}: ProjectsTabProps) {
  const [name, setName] = useState("");
  const [unitCostInput, setUnitCostInput] = useState("");
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
  const [updatingProjectId, setUpdatingProjectId] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingProject, setEditingProject] = useState<EnterpriseProject | null>(null);
  const [deletingProject, setDeletingProject] = useState<EnterpriseProject | null>(null);
  const [discardingProject, setDiscardingProject] = useState<EnterpriseProject | null>(null);

  const unitCost = Number(unitCostInput);
  const quantityValue = Number(quantity);
  const unitCostMinor = toMinorUnits(unitCost);
  const estimatedTotalMinor =
    Number.isInteger(quantityValue) && quantityValue > 0 && Number.isSafeInteger(unitCostMinor)
      ? unitCostMinor * quantityValue
      : 0;
  const purchaseTotal = Number.isSafeInteger(estimatedTotalMinor) ? estimatedTotalMinor / 100 : 0;
  const salePriceValue = Number(salePrice);
  const salePriceMinor = toMinorUnits(salePriceValue);
  const hasExpectedRevenue =
    Number.isInteger(quantityValue) &&
    quantityValue > 0 &&
    Number.isSafeInteger(salePriceMinor) &&
    salePriceMinor > 0;
  const expectedRevenueMinor =
    hasExpectedRevenue
      ? salePriceMinor * quantityValue
      : 0;
  const estimatedRoi =
    Number.isSafeInteger(estimatedTotalMinor) &&
    estimatedTotalMinor > 0 &&
    hasExpectedRevenue &&
    Number.isSafeInteger(expectedRevenueMinor)
      ? ((expectedRevenueMinor - estimatedTotalMinor) / estimatedTotalMinor) * 100
      : null;
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
  const pagination = usePagination(filteredProjects);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const costPerUnit = Number(unitCostInput);
    const units = Number(quantity);
    const price = Number(salePrice);
    const costPerUnitMinor = toMinorUnits(costPerUnit);
    const totalMinor = costPerUnitMinor * units;
    const priceMinor = toMinorUnits(price);

    if (!name.trim() || !Number.isFinite(costPerUnit) || costPerUnit <= 0 || !Number.isSafeInteger(costPerUnitMinor) || costPerUnitMinor < 1) {
      setError("Escribe un nombre y un costo unitario mayor que cero.");
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
        purchaseTotal: totalMinor / 100,
        currency,
        condition,
        quantityPurchased: units,
        salePriceUnit: price,
      });
      setName("");
      setUnitCostInput("");
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

  async function handleStageAction(project: EnterpriseProject, action: "acquire" | "discard") {
    setUpdatingProjectId(project.id);
    setActionError("");
    try {
      await (action === "acquire" ? onAcquire(project) : onDiscard(project));
    } catch (stageError) {
      setActionError(stageError instanceof Error ? stageError.message : "No se pudo actualizar el estado.");
    } finally {
      setUpdatingProjectId("");
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
            Gestiona oportunidades desde el análisis hasta su adquisición y entrada al inventario.
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
            {pagination.pageItems.map((project) => (
              <article className="flex flex-wrap items-center justify-between gap-3 py-4" key={project.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-white">{project.name}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${project.condition === "Nuevo" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                      {project.condition}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {project.status === "evaluation"
                      ? `Estimado: ${project.quantityPurchased} unidades · ${formatMoney(project.purchaseTotal, project.currency)}`
                      : `${project.availableUnits}/${project.quantityPurchased} unidades · ${formatMoney(project.purchaseTotal, project.currency)}`}
                  </p>
                  {project.status === "evaluation" && project.purchaseTotal > 0 && project.salePriceUnit > 0 && (
                    <p className={`mt-1 text-xs font-semibold ${project.salePriceUnit * project.quantityPurchased >= project.purchaseTotal ? "text-emerald-300" : "text-rose-300"}`}>
                      ROI estimado: {project.purchaseTotal > 0
                        ? (((project.salePriceUnit * project.quantityPurchased - project.purchaseTotal) / project.purchaseTotal) * 100).toFixed(1)
                        : "0.0"}%
                      <span className="ml-1 font-normal text-slate-500">
                        · Venta esperada: {formatMoney(project.salePriceUnit * project.quantityPurchased, project.currency)}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    project.status === "purchased"
                      ? "border-purple-400/20 text-purple-200"
                      : project.status === "evaluation"
                        ? "border-amber-400/20 text-amber-200"
                        : "border-slate-600 text-slate-400"
                  }`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                  {project.status === "evaluation" && (
                    <>
                      <button
                        aria-label={`Editar ${project.name}`}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-purple-400/20 text-purple-200 hover:bg-purple-400/10 disabled:opacity-50"
                        disabled={updatingProjectId === project.id}
                        onClick={() => setEditingProject(project)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        aria-label={`Eliminar ${project.name}`}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-rose-400/20 text-rose-200 hover:bg-rose-400/10 disabled:opacity-50"
                        disabled={updatingProjectId === project.id}
                        onClick={() => setDeletingProject(project)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-500/30 px-3 text-xs font-medium text-slate-300 hover:bg-slate-500/10 disabled:opacity-50"
                        disabled={updatingProjectId === project.id}
                        onClick={() => setDiscardingProject(project)}
                        type="button"
                      >
                        <ArchiveX aria-hidden="true" className="size-3.5" />
                        Descartar
                      </button>
                    </>
                  )}
                  {project.status === "evaluation" && (
                    <button
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                      disabled={updatingProjectId === project.id}
                      onClick={() => handleStageAction(project, "acquire")}
                      type="button"
                    >
                      <ShoppingCart aria-hidden="true" className="size-3.5" />
                      {updatingProjectId === project.id ? "Registrando…" : "Confirmar compra"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && filteredProjects.length > 0 && (
          <PaginationControls
            currentPage={pagination.currentPage}
            label="proyectos del pipeline"
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.changePageSize}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            totalItems={filteredProjects.length}
          />
        )}
        {actionError && (
          <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200" role="alert">
            {actionError}
          </p>
        )}
      </div>

      <div className="mb-6 border-t border-white/10 pt-7">
        <h3 className="text-base font-semibold text-white">Registrar oportunidad o lote</h3>
        <p className="mt-1 text-sm text-slate-400">Al guardar se creará una oportunidad en evaluación, sin reservar capital ni crear stock activo.</p>
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
            <label className={labelClass} htmlFor="unit-cost">
              Costo unitario
            </label>
            <input
              className={inputClass}
              id="unit-cost"
              min="0.01"
              onChange={(event) => setUnitCostInput(event.target.value)}
              placeholder="0,00"
              required
              step="0.01"
              type="number"
              value={unitCostInput}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="quantity">
              Unidades estimadas
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

          <div>
            <label className={labelClass} htmlFor="currency">
              Moneda estimada
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

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="sale-price">
              Precio de venta unitario estimado
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
            <span className="text-sm text-slate-400">Costo total estimado</span>
          </div>
          <span className="text-lg font-semibold tabular-nums text-white">
            {formatMoney(purchaseTotal, currency)}
          </span>
        </div>
        {estimatedRoi !== null && (
          <p className={`mt-3 rounded-lg border px-3.5 py-3 text-sm ${
            estimatedRoi >= 0
              ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200"
              : "border-rose-400/20 bg-rose-400/5 text-rose-200"
          }`}>
            ROI estimado: <strong>{estimatedRoi.toFixed(2)}%</strong>
            <span className="ml-2 text-slate-400">
              · Venta total esperada: {formatMoney(expectedRevenueMinor / 100, currency)}
            </span>
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <CircleDollarSign aria-hidden="true" className="size-4" />
            La evaluación no afecta balances ni inventario. Las finanzas se actualizan al registrar la adquisición.
          </p>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? "Guardando…" : "Guardar en evaluación"}
          </button>
        </div>
      </form>
      {editingProject && (
        <ProjectEditDialog
          onClose={() => setEditingProject(null)}
          onSave={(input) => onEdit(editingProject, input)}
          project={editingProject}
        />
      )}
      {deletingProject && (
        <ProjectDeleteDialog
          onClose={() => setDeletingProject(null)}
          onConfirm={() => onDelete(deletingProject)}
          project={deletingProject}
        />
      )}
      {discardingProject && (
        <ProjectDiscardDialog
          onClose={() => setDiscardingProject(null)}
          onConfirm={() => onDiscard(discardingProject)}
          project={discardingProject}
        />
      )}
    </section>
  );
}

type ProjectEditDialogProps = {
  project: EnterpriseProject;
  onSave: (input: ProjectEditInput) => Promise<void>;
  onClose: () => void;
};

function ProjectEditDialog({ project, onSave, onClose }: ProjectEditDialogProps) {
  const [name, setName] = useState(project.name);
  const [unitCostInput, setUnitCostInput] = useState(String(project.unitCost));
  const [currency, setCurrency] = useState<Currency>(project.currency);
  const [condition, setCondition] = useState<ProductCondition>(project.condition);
  const [quantity, setQuantity] = useState(String(project.quantityPurchased));
  const [salePrice, setSalePrice] = useState(String(project.salePriceUnit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const unitCostMinor = toMinorUnits(Number(unitCostInput));
  const quantityValue = Number(quantity);
  const totalMinor = Number.isInteger(quantityValue) && Number.isSafeInteger(unitCostMinor)
    ? unitCostMinor * quantityValue
    : 0;
  const purchaseTotal = Number.isSafeInteger(totalMinor) ? totalMinor / 100 : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const units = Number(quantity);
    const price = Number(salePrice);
    const priceMinor = toMinorUnits(price);

    if (
      !name.trim() ||
      !Number.isFinite(Number(unitCostInput)) ||
      Number(unitCostInput) <= 0 ||
      !Number.isSafeInteger(unitCostMinor) ||
      unitCostMinor < 1 ||
      !Number.isSafeInteger(totalMinor) ||
      totalMinor < 1
    ) {
      setError("Escribe un nombre y un costo unitario mayor que cero.");
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
      await onSave({
        name: name.trim(),
        purchaseTotal,
        currency,
        condition,
        quantityPurchased: units,
        salePriceUnit: price,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4" role="presentation">
      <section
        aria-labelledby="edit-project-title"
        aria-modal="true"
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        role="dialog"
      >
        <h3 className="text-lg font-semibold text-white" id="edit-project-title">Editar proyecto</h3>
        <p className="mt-1 text-sm text-slate-400">Solo se pueden modificar proyectos en sus etapas iniciales.</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-300 sm:col-span-2">
            Nombre
            <input className={`${dialogInputClass} mt-2`} maxLength={100} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="text-sm text-slate-300">
            Costo unitario
            <input className={`${dialogInputClass} mt-2`} min="0.01" onChange={(event) => setUnitCostInput(event.target.value)} required step="0.01" type="number" value={unitCostInput} />
          </label>
          <label className="text-sm text-slate-300">
            Moneda
            <select className={`${dialogInputClass} mt-2`} onChange={(event) => setCurrency(event.target.value as Currency)} value={currency}>
              <option value="Bs">Bolívares (Bs)</option>
              <option value="$">Dólares ($)</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Condición
            <select className={`${dialogInputClass} mt-2`} onChange={(event) => setCondition(event.target.value as ProductCondition)} value={condition}>
              <option value="Nuevo">Nuevo</option>
              <option value="Usado">Usado</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Unidades estimadas
            <input className={`${dialogInputClass} mt-2`} min="1" onChange={(event) => setQuantity(event.target.value)} required step="1" type="number" value={quantity} />
          </label>
          <label className="text-sm text-slate-300">
            Precio de venta unitario
            <input className={`${dialogInputClass} mt-2`} min="0.01" onChange={(event) => setSalePrice(event.target.value)} required step="0.01" type="number" value={salePrice} />
          </label>
          <div className="text-sm text-slate-300">
            Estado
            <p className="mt-2 flex h-11 items-center rounded-lg border border-white/10 bg-slate-950 px-3.5 text-amber-200">
              {PROJECT_STATUS_LABELS.evaluation}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3.5 py-3 text-sm sm:col-span-2">
            <span className="text-slate-400">Costo total estimado</span>
            <strong className="ml-2 tabular-nums text-white">{formatMoney(purchaseTotal, currency)}</strong>
          </div>
          {error && (
            <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200 sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
            <button className="h-10 rounded-lg border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/5" disabled={saving} onClick={onClose} type="button">
              Cancelar
            </button>
            <button className="h-10 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50" disabled={saving} type="submit">
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type ProjectDeleteDialogProps = {
  project: EnterpriseProject;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

function ProjectDeleteDialog({ project, onConfirm, onClose }: ProjectDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el proyecto.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation">
      <section
        aria-labelledby="delete-project-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        role="alertdialog"
      >
        <h3 className="text-lg font-semibold text-white" id="delete-project-title">Eliminar proyecto</h3>
        <p className="mt-2 text-sm text-slate-400">
          ¿Seguro que deseas eliminar <strong className="text-slate-200">{project.name}</strong>? Esta acción no se puede deshacer.
        </p>
        {error && <p className="mt-4 text-sm text-rose-200" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="h-10 rounded-lg border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/5" disabled={deleting} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50" disabled={deleting} onClick={handleDelete} type="button">
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ProjectDiscardDialog({ project, onConfirm, onClose }: ProjectDeleteDialogProps) {
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");

  async function handleDiscard() {
    setDiscarding(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (discardError) {
      setError(discardError instanceof Error ? discardError.message : "No se pudo descartar el proyecto.");
    } finally {
      setDiscarding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation">
      <section
        aria-labelledby="discard-project-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        role="alertdialog"
      >
        <h3 className="text-lg font-semibold text-white" id="discard-project-title">Descartar oportunidad</h3>
        <p className="mt-2 text-sm text-slate-400">
          <strong className="text-slate-200">{project.name}</strong> se archivará como descartado. No se afectarán el capital ni el inventario.
        </p>
        {error && <p className="mt-4 text-sm text-rose-200" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="h-10 rounded-lg border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/5" disabled={discarding} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="h-10 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50" disabled={discarding} onClick={handleDiscard} type="button">
            {discarding ? "Archivando…" : "Confirmar descarte"}
          </button>
        </div>
      </section>
    </div>
  );
}

const dialogInputClass =
  "h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-600/25";