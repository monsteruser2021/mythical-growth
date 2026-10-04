"use client";

import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  Archive,
  CircleDollarSign,
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
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthGuard";
import {
  BALANCES_COLLECTION,
  LEDGER_COLLECTION,
  PROJECTS_COLLECTION,
  balanceDocumentId,
  ledgerEntryFromSnapshot,
  projectFromSnapshot,
  saleFromSnapshot,
  toMinorUnits,
  type CapitalContributionInput,
  type Currency,
  type CurrencyExchangeInput,
  type EnterpriseProject,
  type LedgerEntry,
  type ProjectDraft,
  type SaleRecord,
  type SaleInput,
  type WorkspaceTab,
} from "@/lib/enterprise";
import HistoryTab from "@/components/HistoryTab";
import InventoryTab from "@/components/InventoryTab";
import FinanceTab from "@/components/FinanceTab";
import ProjectsTab from "@/components/ProjectsTab";
import { processSaleAndSyncFinance } from "@/lib/processSaleAndSyncFinance";

type Notice = { kind: "success" | "error"; message: string };

const tabs: { id: WorkspaceTab; label: string; icon: typeof Lightbulb }[] = [
  { id: "projects", label: "Proyectos / Pipeline", icon: Lightbulb },
  { id: "inventory", label: "Inventario activo", icon: Boxes },
  { id: "history", label: "Historial y liquidados", icon: Archive },
  { id: "finance", label: "Finanzas y balance", icon: CircleDollarSign },
];

function readBalanceAmount(data: Record<string, unknown> | undefined) {
  const amount = data?.amountMinor;
  return typeof amount === "number" && Number.isSafeInteger(amount) ? amount : 0;
}

export default function EnterpriseWorkspace() {
  const user = useAuth();
  if (!user) return null;
  return <AuthenticatedWorkspace key={user.uid} user={user} />;
}

function AuthenticatedWorkspace({ user }: { user: User }) {
  const router = useRouter();
  const userId = user.uid;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("projects");
  const [projects, setProjects] = useState<EnterpriseProject[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState("");
  const [balances, setBalances] = useState<Record<Currency, number>>({ Bs: 0, "$": 0 });
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [financeError, setFinanceError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const projectsRef = query(
      collection(db, PROJECTS_COLLECTION),
      where("userId", "==", userId),
    );
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
  }, [userId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collectionGroup(db, "sales"), where("userId", "==", userId)),
      (snapshot) => {
        const saleRecords = snapshot.docs
          .flatMap((saleDoc) => {
            const projectRef = saleDoc.ref.parent.parent;
            if (!projectRef || projectRef.parent.id !== PROJECTS_COLLECTION) return [];
            return [saleFromSnapshot(saleDoc.id, projectRef.id, saleDoc.data())];
          })
          .sort((first, second) => (second.soldAt?.getTime() ?? 0) - (first.soldAt?.getTime() ?? 0));
        setSales(saleRecords);
        setSalesLoading(false);
        setSalesError("");
      },
      () => {
        setSalesLoading(false);
        setSalesError("No se pudo cargar el historial de ventas. Revisa los permisos de Firestore.");
      },
    );
    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    const unsubscribeLedger = onSnapshot(
      query(collection(db, LEDGER_COLLECTION), where("userId", "==", userId)),
      (snapshot) => {
        const entries = snapshot.docs
          .map((entryDoc) => ledgerEntryFromSnapshot(entryDoc.id, entryDoc.data()))
          .filter((entry): entry is LedgerEntry => entry !== null)
          .sort((first, second) => (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0));
        setLedgerEntries(entries);
        setFinanceLoading(false);
        setFinanceError("");
      },
      () => {
        setFinanceLoading(false);
        setFinanceError("No se pudo sincronizar el libro financiero. Revisa la conexión y los permisos de Firestore.");
      },
    );
    const unsubscribeBalances = onSnapshot(
      query(collection(db, BALANCES_COLLECTION), where("userId", "==", userId)),
      (snapshot) => {
        const nextBalances: Record<Currency, number> = { Bs: 0, "$": 0 };
        for (const balanceDoc of snapshot.docs) {
          const balance = balanceDoc.data();
          if (balanceDoc.id === balanceDocumentId(userId, "Bs")) {
            nextBalances.Bs = readBalanceAmount(balance);
          } else if (balanceDoc.id === balanceDocumentId(userId, "$")) {
            nextBalances["$"] = readBalanceAmount(balance);
          }
        }
        setBalances(nextBalances);
      },
      () => setFinanceError("No se pudieron sincronizar los balances financieros."),
    );
    return () => {
      unsubscribeLedger();
      unsubscribeBalances();
    };
  }, [userId]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function createProject(project: ProjectDraft) {
    if (!userId) throw new Error("Debes iniciar sesión para gestionar tus proyectos.");
    const projectRef = doc(collection(db, PROJECTS_COLLECTION));
    const ledgerRef = doc(collection(db, LEDGER_COLLECTION));
    const balanceRef = doc(db, BALANCES_COLLECTION, balanceDocumentId(userId, project.currency));
    const acquisitionMinor = toMinorUnits(project.purchaseTotal);
    if (!Number.isSafeInteger(acquisitionMinor) || acquisitionMinor < 1) {
      throw new Error("El costo de adquisición supera el importe admitido.");
    }

    await runTransaction(db, async (transaction) => {
      const balanceSnapshot = await transaction.get(balanceRef);
      const currentBalance = readBalanceAmount(balanceSnapshot.data());
      if (currentBalance < acquisitionMinor) {
        throw new Error(`Fondos insuficientes en ${project.currency}. Registra o convierte capital antes de activar este proyecto.`);
      }

      transaction.set(projectRef, {
        ...project,
        userId,
        unitCost: project.purchaseTotal / project.quantityPurchased,
        availableUnits: project.quantityPurchased,
        totalRevenue: 0,
        capitalRecovered: 0,
        netProfit: 0,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.set(ledgerRef, {
        userId,
        category: "investment",
        operation: "project_acquisition",
        currency: project.currency,
        amountMinor: -acquisitionMinor,
        description: `Adquisición · ${project.name}`,
        projectId: projectRef.id,
        exchangeGroupId: null,
        createdAt: serverTimestamp(),
      });
      transaction.set(balanceRef, {
        userId,
        currency: project.currency,
        amountMinor: currentBalance - acquisitionMinor,
        updatedAt: serverTimestamp(),
      });
    });
    setNotice({ kind: "success", message: "Proyecto guardado y activado en inventario." });
    setActiveTab("inventory");
  }

  async function registerSale(project: EnterpriseProject, sale: SaleInput) {
    if (!userId) throw new Error("Debes iniciar sesión para registrar ventas.");
    await processSaleAndSyncFinance(db, userId, project.id, sale);
    setNotice({ kind: "success", message: "Venta registrada y stock actualizado." });
  }

  async function addCapital(input: CapitalContributionInput) {
    if (!userId) throw new Error("Debes iniciar sesión para registrar movimientos financieros.");
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 1) {
      throw new Error("El aporte supera el importe admitido.");
    }
    const ledgerRef = doc(collection(db, LEDGER_COLLECTION));
    const balanceRef = doc(db, BALANCES_COLLECTION, balanceDocumentId(userId, input.currency));
    await runTransaction(db, async (transaction) => {
      const balanceSnapshot = await transaction.get(balanceRef);
      const nextBalance = readBalanceAmount(balanceSnapshot.data()) + input.amountMinor;
      if (!Number.isSafeInteger(nextBalance)) throw new Error("El balance supera el importe contable admitido.");
      transaction.set(ledgerRef, {
        userId,
        category: "investment",
        operation: "capital_contribution",
        currency: input.currency,
        amountMinor: input.amountMinor,
        description: input.description,
        projectId: null,
        exchangeGroupId: null,
        createdAt: serverTimestamp(),
      });
      transaction.set(balanceRef, {
        userId,
        currency: input.currency,
        amountMinor: nextBalance,
        updatedAt: serverTimestamp(),
      });
    });
    setNotice({ kind: "success", message: `Aporte de ${input.currency} registrado en el libro financiero.` });
  }

  async function exchangeCurrency(input: CurrencyExchangeInput) {
    if (!userId) throw new Error("Debes iniciar sesión para convertir divisas.");
    if (input.sourceCurrency === input.targetCurrency) throw new Error("Selecciona monedas distintas para convertir.");
    if (!Number.isSafeInteger(input.sourceAmountMinor) || !Number.isSafeInteger(input.targetAmountMinor) || input.sourceAmountMinor < 1 || input.targetAmountMinor < 1 || !Number.isFinite(input.rate) || input.rate <= 0) {
      throw new Error("Los importes o la tasa de cambio no son válidos.");
    }
    const sourceLedgerRef = doc(collection(db, LEDGER_COLLECTION));
    const targetLedgerRef = doc(collection(db, LEDGER_COLLECTION));
    const exchangeGroupId = sourceLedgerRef.id;
    const sourceBalanceRef = doc(db, BALANCES_COLLECTION, balanceDocumentId(userId, input.sourceCurrency));
    const targetBalanceRef = doc(db, BALANCES_COLLECTION, balanceDocumentId(userId, input.targetCurrency));

    await runTransaction(db, async (transaction) => {
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        transaction.get(sourceBalanceRef),
        transaction.get(targetBalanceRef),
      ]);
      const sourceBalance = readBalanceAmount(sourceSnapshot.data());
      const targetBalance = readBalanceAmount(targetSnapshot.data());
      if (sourceBalance < input.sourceAmountMinor) {
        throw new Error(`Saldo insuficiente en ${input.sourceCurrency} para completar el cambio.`);
      }
      if (!Number.isSafeInteger(targetBalance + input.targetAmountMinor)) {
        throw new Error("El balance destino supera el importe contable admitido.");
      }

      transaction.set(sourceLedgerRef, {
        userId,
        category: "investment",
        operation: "currency_exchange",
        currency: input.sourceCurrency,
        amountMinor: -input.sourceAmountMinor,
        description: `${input.description} · entregado`,
        projectId: null,
        exchangeGroupId,
        exchangeRate: input.rate,
        counterpartCurrency: input.targetCurrency,
        counterpartAmountMinor: input.targetAmountMinor,
        createdAt: serverTimestamp(),
      });
      transaction.set(targetLedgerRef, {
        userId,
        category: "investment",
        operation: "currency_exchange",
        currency: input.targetCurrency,
        amountMinor: input.targetAmountMinor,
        description: `${input.description} · recibido`,
        projectId: null,
        exchangeGroupId,
        exchangeRate: input.rate,
        counterpartCurrency: input.sourceCurrency,
        counterpartAmountMinor: input.sourceAmountMinor,
        createdAt: serverTimestamp(),
      });
      transaction.set(sourceBalanceRef, {
        userId,
        currency: input.sourceCurrency,
        amountMinor: sourceBalance - input.sourceAmountMinor,
        updatedAt: serverTimestamp(),
      });
      transaction.set(targetBalanceRef, {
        userId,
        currency: input.targetCurrency,
        amountMinor: targetBalance + input.targetAmountMinor,
        updatedAt: serverTimestamp(),
      });
    });

    setNotice({ kind: "success", message: "Cambio de divisas registrado en ambas monedas." });
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
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const salesForExport = sales.map((sale) => {
    const project = projectById.get(sale.projectId);
    return {
      ...sale,
      projectName: sale.projectName || project?.name || "Proyecto eliminado",
      condition: sale.condition ?? project?.condition ?? null,
      unitCost: sale.unitCost || project?.unitCost || 0,
    };
  });

  return (
    <main className="min-h-screen bg-transparent text-slate-100">
      <header className="border-b border-white/10 bg-purple-950/15 backdrop-blur-sm">
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
            <span className="hidden max-w-48 truncate text-xs text-slate-400 sm:block">{user.email}</span>
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
          {activeTab === "projects" && <ProjectsTab loading={loading} onCreate={createProject} projects={projects} />}
          {activeTab === "inventory" && (
            <InventoryTab loading={loading} onSell={registerSale} projects={activeProjects} />
          )}
          {activeTab === "history" && (
            <HistoryTab
              allProjects={projects}
              loading={loading}
              onExportSuccess={() => setNotice({ kind: "success", message: "Historial de ventas exportado en Excel." })}
              projects={liquidatedProjects}
              sales={salesForExport}
              salesError={salesError}
              salesLoading={salesLoading}
            />
          )}
          {activeTab === "finance" && (
            <FinanceTab
              balances={balances}
              entries={ledgerEntries}
              error={financeError}
              loading={financeLoading}
              onExportSuccess={() => setNotice({ kind: "success", message: "Balance financiero exportado en Excel." })}
              onAddCapital={addCapital}
              onExchange={exchangeCurrency}
            />
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