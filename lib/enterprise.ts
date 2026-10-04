export const PROJECTS_COLLECTION = "enterprise_projects";
export const LEDGER_COLLECTION = "enterprise_financial_ledger";
export const BALANCES_COLLECTION = "enterprise_financial_balances";

export function balanceDocumentId(userId: string, currency: Currency) {
  return `${userId}_${currency === "Bs" ? "VES" : "USD"}`;
}

export type Currency = "Bs" | "$";
export type ProductCondition = "Nuevo" | "Usado";
export type ProjectStatus = "evaluation" | "in_progress" | "purchased" | "liquidation";
export const PROJECT_STATUSES = [
  "evaluation",
  "in_progress",
  "purchased",
  "liquidation",
] as const satisfies readonly ProjectStatus[];
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

export type EditableProjectStatus = Extract<ProjectStatus, "evaluation" | "in_progress">;

export type ProjectEditInput = ProjectDraft & {
  status: EditableProjectStatus;
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

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  evaluation: "En Evaluación",
  in_progress: "En Proceso",
  purchased: "Comprado / Adquirido",
  liquidation: "Vendido / Liquidado",
};

export type SaleInput = {
  quantity: number;
  unitPrice: number;
};

export type SaleRecord = {
  id: string;
  projectId: string;
  projectName: string;
  condition: ProductCondition | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  currency: Currency;
  capitalRecovered: number;
  netProfit: number;
  soldAt: Date | null;
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
    status:
      data.status === "liquidation"
        ? "liquidation"
        : data.status === "evaluation"
          ? "evaluation"
          : data.status === "in_progress"
            ? "in_progress"
            : "purchased",
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

export function saleFromSnapshot(
  id: string,
  projectId: string,
  data: Record<string, unknown>,
): SaleRecord {
  const timestamp = data.soldAt;
  const soldAt =
    timestamp && typeof timestamp === "object" && "toDate" in timestamp &&
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : timestamp instanceof Date
        ? timestamp
        : null;

  return {
    id,
    projectId,
    projectName: typeof data.projectName === "string" ? data.projectName : "",
    condition: data.condition === "Usado" ? "Usado" : data.condition === "Nuevo" ? "Nuevo" : null,
    quantity: Math.max(0, Math.floor(numberValue(data.quantity))),
    unitCost: numberValue(data.unitCost),
    unitPrice: numberValue(data.unitPrice),
    currency: data.currency === "$" ? "$" : "Bs",
    capitalRecovered: numberValue(data.capitalRecovered),
    netProfit: numberValue(data.netProfit),
    soldAt,
  };
}