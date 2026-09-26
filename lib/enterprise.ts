export const PROJECTS_COLLECTION = "enterprise_projects";

export type Currency = "Bs" | "$";
export type ProductCondition = "Nuevo" | "Usado";
export type ProjectStatus = "active" | "liquidation";
export type WorkspaceTab = "projects" | "inventory" | "history";

export type ProjectDraft = {
  name: string;
  purchaseTotal: number;
  currency: Currency;
  condition: ProductCondition;
  quantityPurchased: number;
  salePriceUnit: number;
};

export type EnterpriseProject = ProjectDraft & {
  id: string;
  availableUnits: number;
  unitCost: number;
  totalRevenue: number;
  capitalRecovered: number;
  netProfit: number;
  status: ProjectStatus;
};

export type SaleInput = {
  quantity: number;
  unitPrice: number;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, currency: Currency) {
  const formatted = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

  return currency === "Bs" ? `Bs ${formatted}` : `$${formatted}`;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function integerValue(value: unknown) {
  return Math.max(0, Math.floor(numberValue(value)));
}

export function projectFromSnapshot(
  id: string,
  data: Record<string, unknown>,
): EnterpriseProject {
  const quantityPurchased = integerValue(data.quantityPurchased);
  const purchaseTotal = numberValue(data.purchaseTotal);

  return {
    id,
    name: typeof data.name === "string" ? data.name : "Proyecto sin nombre",
    purchaseTotal,
    currency: data.currency === "$" ? "$" : "Bs",
    condition: data.condition === "Usado" ? "Usado" : "Nuevo",
    quantityPurchased,
    salePriceUnit: numberValue(data.salePriceUnit),
    availableUnits: Math.min(quantityPurchased, integerValue(data.availableUnits)),
    unitCost: numberValue(data.unitCost) || (quantityPurchased ? purchaseTotal / quantityPurchased : 0),
    totalRevenue: numberValue(data.totalRevenue),
    capitalRecovered: numberValue(data.capitalRecovered),
    netProfit: numberValue(data.netProfit),
    status: data.status === "liquidation" ? "liquidation" : "active",
  };
}