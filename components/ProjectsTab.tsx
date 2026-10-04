"use client";

import {
  ArrowRight,
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
  type EditableProjectStatus,
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

type ProjectsTabProps = {
  projects: EnterpriseProject[];
  loading: boolean;
  onCreate: (project: ProjectDraft) => Promise<void>;
  onAdvance: (project: EnterpriseProject) => Promise<void>;
  onAcquire: (project: EnterpriseProject) => Promise<void>;
  onEdit: (project: EnterpriseProject, input: ProjectEditInput) => Promise<void>;
  onDelete: (project: EnterpriseProject) => Promise<void>;
};

export default function ProjectsTab({
  projects,
  loading,
  onCreate,
  onAdvance,
  onAcquire,
  onEdit,
  onDelete,
}: ProjectsTabProps) {
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
  const [updatingProjectId, setUpdatingProjectId] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingProject, setEditingProject] = useState<EnterpriseProject | null>(null);
  const [deletingProject, setDeletingProject] = useState<EnterpriseProject | null>(null);

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

  async function handleStageAction(project: EnterpriseProject, action: "advance" | "acquire") {
    setUpdatingProjectId(project.id);
    setActionError("");
    try {
      await (action === "advance" ? onAdvance(project) : onAcquire(project));
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
                    {project.status === "evaluation" || project.status === "in_progress"
                      ? `Estimado: ${project.quantityPurchased} unidades · ${formatMoney(project.purchaseTotal, project.currency)}`
                      : `${project.availableUnits}/${project.quantityPurchased} unidades · ${formatMoney(project.purchaseTotal, project.currency)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    project.status === "purchased"
                      ? "border-purple-400/20 text-purple-200"
                      : project.status === "evaluation"
                        ? "border-amber-400/20 text-amber-200"
                        : project.status === "in_progress"
                          ? "border-sky-400/20 text-sky-200"
                          : "border-slate-600 text-slate-400"
                  }`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                  {(project.status === "evaluation" || project.status === "in_progress") && (
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
                    </>
                  )}
                  {project.status === "evaluation" && (
                    <button
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-400/25 px-3 text-xs font-medium text-sky-200 hover:bg-sky-400/10 disabled:opacity-50"
                      disabled={updatingProjectId === project.id}
                      onClick={() => handleStageAction(project, "advance")}
                      type="button"
                    >
                      {updatingProjectId === project.id ? "Actualizando…" : <>Avanzar a En Proceso <ArrowRight aria-hidden="true" className="size-3.5" /></>}
                    </button>
                  )}
                  {project.status === "in_progress" && (
                    <button
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                      disabled={updatingProjectId === project.id}
                      onClick={() => handleStageAction(project, "acquire")}
                      type="button"
                    >
                      <ShoppingCart aria-hidden="true" className="size-3.5" />
                      {updatingProjectId === project.id ? "Registrando…" : "Registrar adquisición"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
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
            <label className={labelClass} htmlFor="purchase-total">
              Costo total estimado
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
  const [purchaseTotal, setPurchaseTotal] = useState(String(project.purchaseTotal));
  const [currency, setCurrency] = useState<Currency>(project.currency);
  const [condition, setCondition] = useState<ProductCondition>(project.condition);
  const [quantity, setQuantity] = useState(String(project.quantityPurchased));
  const [salePrice, setSalePrice] = useState(String(project.salePriceUnit));
  const [status, setStatus] = useState<EditableProjectStatus>(
    project.status === "in_progress" ? "in_progress" : "evaluation",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      await onSave({
        name: name.trim(),
        purchaseTotal: total,
        currency,
        condition,
        quantityPurchased: units,
        salePriceUnit: price,
        status,
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
            Costo total
            <input className={`${dialogInputClass} mt-2`} min="0.01" onChange={(event) => setPurchaseTotal(event.target.value)} required step="0.01" type="number" value={purchaseTotal} />
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
          <label className="text-sm text-slate-300">
            Estado
            <select className={`${dialogInputClass} mt-2`} onChange={(event) => setStatus(event.target.value as EditableProjectStatus)} value={status}>
              <option value="evaluation">{PROJECT_STATUS_LABELS.evaluation}</option>
              <option value="in_progress">{PROJECT_STATUS_LABELS.in_progress}</option>
            </select>
          </label>
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

const dialogInputClass =
  "h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-600/25";