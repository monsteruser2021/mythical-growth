"use client";

import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  Archive,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Sprout,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  PROJECTS_COLLECTION,
  projectFromSnapshot,
  roundMoney,
  type EnterpriseProject,
  type ProjectDraft,
  type SaleInput,
  type WorkspaceTab,
} from "@/lib/enterprise";
import HistoryTab from "@/components/HistoryTab";
import InventoryTab from "@/components/InventoryTab";
import ProjectsTab from "@/components/ProjectsTab";

type Notice = { kind: "success" | "error"; message: string };

const tabs: { id: WorkspaceTab; label: string; icon: typeof Lightbulb }[] = [
  { id: "projects", label: "Proyectos / Pipeline", icon: Lightbulb },
  { id: "inventory", label: "Inventario activo", icon: Boxes },
  { id: "history", label: "Historial y liquidados", icon: Archive },
];

export default function EnterpriseWorkspace() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("projects");
  const [projects, setProjects] = useState<EnterpriseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    return onSnapshot(
      projectsRef,
      (snapshot) => {
        setProjects(snapshot.docs.map((projectDoc) => projectFromSnapshot(projectDoc.id, projectDoc.data())));
        setLoading(false);
        setSubscriptionError("");
      },
      () => {
        setLoading(false);
        setSubscriptionError("No se pudo sincronizar Firestore. Revisa la conexión y los permisos de la base de datos.");
      },
    );
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function createProject(project: ProjectDraft) {
    const unitCost = project.purchaseTotal / project.quantityPurchased;
    await addDoc(collection(db, PROJECTS_COLLECTION), {
      ...project,
      unitCost,
      availableUnits: project.quantityPurchased,
      totalRevenue: 0,
      capitalRecovered: 0,
      netProfit: 0,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNotice({ kind: "success", message: "Proyecto guardado y activado en inventario." });
    setActiveTab("inventory");
  }

  async function registerSale(project: EnterpriseProject, sale: SaleInput) {
    const projectRef = doc(db, PROJECTS_COLLECTION, project.id);
    const saleRef = doc(collection(db, PROJECTS_COLLECTION, project.id, "sales"));

    await runTransaction(db, async (transaction) => {
      const projectSnapshot = await transaction.get(projectRef);
      if (!projectSnapshot.exists()) throw new Error("El proyecto ya no existe.");

      const current = projectFromSnapshot(projectSnapshot.id, projectSnapshot.data());
      if (current.status !== "active") throw new Error("Este lote ya fue liquidado.");
      if (!Number.isInteger(sale.quantity) || sale.quantity < 1 || sale.quantity > current.availableUnits) {
        throw new Error("El stock cambió. Actualiza la cantidad e inténtalo otra vez.");
      }
      if (!Number.isFinite(sale.unitPrice) || sale.unitPrice <= 0) {
        throw new Error("El precio de venta debe ser mayor que cero.");
      }

      const remainingUnits = current.availableUnits - sale.quantity;
      const revenue = roundMoney(sale.unitPrice * sale.quantity);
      const capitalRecovered = remainingUnits === 0
        ? roundMoney(current.purchaseTotal - current.capitalRecovered)
        : roundMoney(current.unitCost * sale.quantity);
      const netProfit = roundMoney(revenue - capitalRecovered);

      transaction.update(projectRef, {
        availableUnits: remainingUnits,
        salePriceUnit: sale.unitPrice,
        totalRevenue: roundMoney(current.totalRevenue + revenue),
        capitalRecovered: roundMoney(current.capitalRecovered + capitalRecovered),
        netProfit: roundMoney(current.netProfit + netProfit),
        status: remainingUnits === 0 ? "liquidation" : "active",
        updatedAt: serverTimestamp(),
      });
      transaction.set(saleRef, {
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        currency: current.currency,
        revenue,
        capitalRecovered,
        netProfit,
        soldAt: serverTimestamp(),
      });
    });

    setNotice({ kind: "success", message: "Venta registrada y stock actualizado." });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut(auth);
      router.replace("/login");
    } catch {
      setNotice({ kind: "error", message: "No se pudo cerrar la sesión." });
      setSigningOut(false);
    }
  }

  const activeProjects = projects
    .filter((project) => project.status === "active" && project.availableUnits > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const liquidatedProjects = projects
    .filter((project) => project.status === "liquidation" || project.availableUnits === 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-950/40">
              <Sprout aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Mythical Growth</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-purple-300">Enterprise</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-xs text-slate-400 sm:block">{auth.currentUser?.email}</span>
            <button
              className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-300 disabled:opacity-50"
              disabled={signingOut}
              onClick={handleSignOut}
              title="Cerrar sesión"
              type="button"
            >
              {signingOut ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <LogOut aria-hidden="true" className="size-4" />}
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pt-8 sm:pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-300">Panel de operaciones</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Gestión de inversión</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Administra lotes, controla existencias y consulta resultados financieros desde un solo espacio.
          </p>
        </div>

        {subscriptionError && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200" role="alert">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{subscriptionError}</span>
          </div>
        )}

        <div className="mt-8 border-b border-white/10">
          <nav aria-label="Secciones de Mythical Growth" className="-mb-px flex gap-2 overflow-x-auto" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                aria-controls={`${id}-panel`}
                aria-selected={activeTab === id}
                className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-300 sm:px-4 ${
                  activeTab === id
                    ? "border-purple-500 text-white"
                    : "border-transparent text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
                id={`${id}-tab`}
                key={id}
                onClick={() => setActiveTab(id)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div
          aria-labelledby={`${activeTab}-tab`}
          id={`${activeTab}-panel`}
          role="tabpanel"
          tabIndex={0}
        >
          {activeTab === "projects" && <ProjectsTab onCreate={createProject} />}
          {activeTab === "inventory" && (
            <InventoryTab loading={loading} onSell={registerSale} projects={activeProjects} />
          )}
          {activeTab === "history" && (
            <HistoryTab allProjects={projects} loading={loading} projects={liquidatedProjects} />
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`fixed bottom-5 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border px-4 py-3 shadow-xl sm:right-6 ${
            notice.kind === "success"
              ? "border-emerald-400/20 bg-slate-900 text-emerald-200"
              : "border-rose-400/20 bg-slate-900 text-rose-200"
          }`}
          role="status"
        >
          {notice.kind === "success" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          <p className="text-sm leading-5">{notice.message}</p>
          <button
            aria-label="Cerrar aviso"
            className="ml-2 flex size-5 shrink-0 items-center justify-center text-current/70 hover:text-current"
            onClick={() => setNotice(null)}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      )}
    </main>
  );
}