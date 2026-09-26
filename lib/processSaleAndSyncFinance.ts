import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import {
  BALANCES_COLLECTION,
  LEDGER_COLLECTION,
  PROJECTS_COLLECTION,
  fromMinorUnits,
  projectFromSnapshot,
  toMinorUnits,
  type Currency,
  type SaleInput,
} from "@/lib/enterprise";

function balanceDocumentId(currency: Currency) {
  return currency === "Bs" ? "VES" : "USD";
}

function readBalanceAmount(data: Record<string, unknown> | undefined) {
  const amount = data?.amountMinor;
  return typeof amount === "number" && Number.isSafeInteger(amount) ? amount : 0;
}

export async function processSaleAndSyncFinance(
  db: Firestore,
  projectId: string,
  sale: SaleInput,
) {
  const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
  const saleRef = doc(collection(db, PROJECTS_COLLECTION, projectId, "sales"));
  const capitalLedgerRef = doc(collection(db, LEDGER_COLLECTION));
  const gainLedgerRef = doc(collection(db, LEDGER_COLLECTION));

  await runTransaction(db, async (transaction) => {
    const projectSnapshot = await transaction.get(projectRef);
    if (!projectSnapshot.exists()) throw new Error("El proyecto ya no existe.");

    const current = projectFromSnapshot(projectSnapshot.id, projectSnapshot.data());
    const balanceRef = doc(db, BALANCES_COLLECTION, balanceDocumentId(current.currency));
    const balanceSnapshot = await transaction.get(balanceRef);
    if (current.status !== "active") throw new Error("Este lote ya fue liquidado.");
    if (!Number.isInteger(sale.quantity) || sale.quantity < 1 || sale.quantity > current.availableUnits) {
      throw new Error("El stock cambió. Actualiza la cantidad e inténtalo otra vez.");
    }

    const unitPriceMinor = toMinorUnits(sale.unitPrice);
    if (!Number.isFinite(sale.unitPrice) || !Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 1) {
      throw new Error("El precio de venta debe ser positivo y tener un máximo de dos decimales.");
    }

    const remainingUnits = current.availableUnits - sale.quantity;
    const capitalRecovered = remainingUnits === 0
      ? fromMinorUnits(toMinorUnits(current.purchaseTotal) - toMinorUnits(current.capitalRecovered))
      : current.unitCost * sale.quantity;
    const capitalRecoveredMinor = toMinorUnits(capitalRecovered);
    const revenueMinor = unitPriceMinor * sale.quantity;
    const netProfitMinor = revenueMinor - capitalRecoveredMinor;
    const currentBalance = readBalanceAmount(balanceSnapshot.data());
    const updatedBalance = currentBalance + revenueMinor;

    if (
      !Number.isSafeInteger(capitalRecoveredMinor) ||
      !Number.isSafeInteger(revenueMinor) ||
      !Number.isSafeInteger(netProfitMinor) ||
      !Number.isSafeInteger(updatedBalance)
    ) {
      throw new Error("El importe de la venta supera el límite contable admitido.");
    }

    const capitalRecoveredAmount = fromMinorUnits(capitalRecoveredMinor);
    const revenue = fromMinorUnits(revenueMinor);
    const netProfit = fromMinorUnits(netProfitMinor);
    const saleUnitPrice = fromMinorUnits(unitPriceMinor);

    transaction.update(projectRef, {
      availableUnits: remainingUnits,
      salePriceUnit: saleUnitPrice,
      totalRevenue: fromMinorUnits(toMinorUnits(current.totalRevenue) + revenueMinor),
      capitalRecovered: fromMinorUnits(toMinorUnits(current.capitalRecovered) + capitalRecoveredMinor),
      netProfit: fromMinorUnits(toMinorUnits(current.netProfit) + netProfitMinor),
      status: remainingUnits === 0 ? "liquidation" : "active",
      updatedAt: serverTimestamp(),
    });
    transaction.set(saleRef, {
      projectName: current.name,
      condition: current.condition,
      unitCost: current.unitCost,
      quantity: sale.quantity,
      unitPrice: saleUnitPrice,
      currency: current.currency,
      revenue,
      capitalRecovered: capitalRecoveredAmount,
      netProfit,
      soldAt: serverTimestamp(),
    });
    transaction.set(capitalLedgerRef, {
      category: "investment",
      operation: "sale_capital_return",
      currency: current.currency,
      amountMinor: capitalRecoveredMinor,
      description: `Capital recuperado · ${current.name}`,
      projectId: current.id,
      exchangeGroupId: null,
      createdAt: serverTimestamp(),
    });
    transaction.set(gainLedgerRef, {
      category: "gain",
      operation: "sale_profit",
      currency: current.currency,
      amountMinor: netProfitMinor,
      description: `Resultado de venta · ${current.name}`,
      projectId: current.id,
      exchangeGroupId: null,
      createdAt: serverTimestamp(),
    });
    transaction.set(balanceRef, {
      currency: current.currency,
      amountMinor: updatedBalance,
      updatedAt: serverTimestamp(),
    });
  });
}