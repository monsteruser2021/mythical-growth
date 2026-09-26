export const PROJECTS_COLLECTION = "enterprise_projects";
export const LEDGER_COLLECTION = "enterprise_financial_ledger";
export const BALANCES_COLLECTION = "enterprise_financial_balances";

export type Currency = "Bs" | "$";
export type ProductCondition = "Nuevo" | "Usado";
export type ProjectStatus = "active" | "liquidation";
export type WorkspaceTab = "projects" | "inventory" | "history" | "finance";
export type FinanceCategory = "investment" | "gain";
export type FinanceOperation =
  | "capital_contribution"
  | "project_acquisition"
  | "sale_capital_return"
  | "sale_profit"
  | "currency_exchange";

export type LedgerEntry = {
  id: string;
  category: FinanceCategory;
  operation: FinanceOperation;
  currency: Currency;
  amountMinor: number;
  description: string;
  projectId: string | null;
  exchangeGroupId: string | null;
  createdAt: Date | null;
};

export type CapitalContributionInput = {
  currency: Currency;
  amountMinor: number;
  description: string;
};

export type CurrencyExchangeInput = {
  sourceCurrency: Currency;
  targetCurrency: Currency;
  sourceAmountMinor: number;
  targetAmountMinor: number;
  rate: number;
  description: string;
};

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

export function toMinorUnits(value: number) {
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromMinorUnits(value: number) {
  return value / 100;
}

export function formatMinorMoney(value: number, currency: Currency) {
  return formatMoney(fromMinorUnits(value), currency);
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

export function ledgerEntryFromSnapshot(
  id: string,
  data: Record<string, unknown>,
): LedgerEntry | null {
  if (data.category !== "investment" && data.category !== "gain") return null;
  const operations: FinanceOperation[] = [
    "capital_contribution",
    "project_acquisition",
    "sale_capital_return",
    "sale_profit",
    "currency_exchange",
  ];
  if (!operations.includes(data.operation as FinanceOperation)) return null;

  const timestamp = data.createdAt;
  const createdAt =
    timestamp && typeof timestamp === "object" && "toDate" in timestamp &&
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : timestamp instanceof Date
        ? timestamp
        : null;

  return {
    id,
    category: data.category,
    operation: data.operation as FinanceOperation,
    currency: data.currency === "$" ? "$" : "Bs",
    amountMinor: Number.isSafeInteger(data.amountMinor) ? Number(data.amountMinor) : 0,
    description: typeof data.description === "string" ? data.description : "Movimiento contable",
    projectId: typeof data.projectId === "string" ? data.projectId : null,
    exchangeGroupId: typeof data.exchangeGroupId === "string" ? data.exchangeGroupId : null,
    createdAt,
  };
}