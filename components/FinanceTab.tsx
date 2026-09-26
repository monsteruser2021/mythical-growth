"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  Coins,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  formatMinorMoney,
  toMinorUnits,
  type CapitalContributionInput,
  type Currency,
  type CurrencyExchangeInput,
  type FinanceCategory,
  type LedgerEntry,
} from "@/lib/enterprise";

type FinanceTabProps = {
  balances: Record<Currency, number>;
  entries: LedgerEntry[];
  loading: boolean;
  error: string;
  onAddCapital: (input: CapitalContributionInput) => Promise<void>;
  onExchange: (input: CurrencyExchangeInput) => Promise<void>;
};

type PendingAction =
  | { kind: "capital"; input: CapitalContributionInput }
  | { kind: "exchange"; input: CurrencyExchangeInput };

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-300";

export default function FinanceTab({
  balances,
  entries,
  loading,
  error,
  onAddCapital,
  onExchange,
}: FinanceTabProps) {
  const [mode, setMode] = useState<"capital" | "exchange">("capital");
  const [categoryFilter, setCategoryFilter] = useState<"all" | FinanceCategory>("all");
  const [currency, setCurrency] = useState<Currency>("Bs");
  const [capitalAmount, setCapitalAmount] = useState("");
  const [capitalDescription, setCapitalDescription] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState<Currency>("Bs");
  const [sourceAmount, setSourceAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [exchangeDescription, setExchangeDescription] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const targetCurrency: Currency = sourceCurrency === "Bs" ? "$" : "Bs";
  const previewTargetMinor = useMemo(() => {
    const amount = Number(sourceAmount);
    const rate = Number(exchangeRate);
    return amount > 0 && rate > 0 ? toMinorUnits(amount * rate) : 0;
  }, [exchangeRate, sourceAmount]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => categoryFilter === "all" || entry.category === categoryFilter),
    [categoryFilter, entries],
  );

  function handleCapitalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const amount = Number(capitalAmount);
    const amountMinor = toMinorUnits(amount);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(amountMinor) || amountMinor < 1) {
      setFormError("El aporte debe ser mayor que cero.");
      return;
    }
    setPendingAction({
      kind: "capital",
      input: {
        currency,
        amountMinor,
        description: capitalDescription.trim() || "Aporte de capital",
      },
    });
  }

  function handleExchangeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const amount = Number(sourceAmount);
    const rate = Number(exchangeRate);
    const sourceAmountMinor = toMinorUnits(amount);
    const targetAmountMinor = toMinorUnits(amount * rate);

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(sourceAmountMinor) || sourceAmountMinor < 1) {
      setFormError("El importe origen debe ser mayor que cero.");
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isSafeInteger(targetAmountMinor) || targetAmountMinor < 1) {
      setFormError("La tasa debe ser positiva y producir un importe destino válido.");
      return;
    }
    setPendingAction({
      kind: "exchange",
      input: {
        sourceCurrency,
        targetCurrency,
        sourceAmountMinor,
        targetAmountMinor,
        rate,
        description: exchangeDescription.trim() || "Compra de divisas",
      },
    });
  }

  async function confirmAction() {
    if (!pendingAction) return;
    setSaving(true);
    setFormError("");
    try {
      if (pendingAction.kind === "capital") {
        await onAddCapital(pendingAction.input);
        setCapitalAmount("");
        setCapitalDescription("");
      } else {
        await onExchange(pendingAction.input);
        setSourceAmount("");
        setExchangeRate("");
        setExchangeDescription("");
      }
      setPendingAction(null);
    } catch (actionError) {
      setFormError(actionError instanceof Error ? actionError.message : "No se pudo guardar el movimiento.");
      setPendingAction(null);
    } finally {
      setSaving(false);
    }
  }

  const balanceCards: { currency: Currency; name: string; icon: typeof Coins; tint: string }[] = [
    { currency: "Bs", name: "Bolívares disponibles", icon: Coins, tint: "text-purple-300" },
    { currency: "$", name: "Dólares disponibles", icon: CircleDollarSign, tint: "text-emerald-300" },
  ];

  return (
    <section aria-labelledby="finance-heading" className="py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/15 text-purple-300">
            <CircleDollarSign aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white" id="finance-heading">Finanzas y balance</h2>
            <p className="mt-1 text-sm text-slate-400">Fondos y movimientos contables de Mythical Growth.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Registro protegido
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {balanceCards.map(({ currency: cardCurrency, name, icon: Icon, tint }) => (
          <article className="rounded-xl border border-white/10 bg-slate-950/35 p-5" key={cardCurrency}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-400">{name}</p>
              <Icon aria-hidden="true" className={`size-5 ${tint}`} />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
              {formatMinorMoney(balances[cardCurrency], cardCurrency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Saldo contable disponible</p>
          </article>
        ))}
      </div>

      <div className="mt-8 border-b border-white/10">
        <nav aria-label="Operaciones financieras" className="flex gap-5" role="tablist">
          <button
            aria-selected={mode === "capital"}
            className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors ${mode === "capital" ? "border-purple-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}
            onClick={() => { setMode("capital"); setFormError(""); }}
            role="tab"
            type="button"
          >
            <ArrowDownLeft aria-hidden="true" className="size-4" />
            Aporte de capital
          </button>
          <button
            aria-selected={mode === "exchange"}
            className={`inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors ${mode === "exchange" ? "border-purple-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}
            onClick={() => { setMode("exchange"); setFormError(""); }}
            role="tab"
            type="button"
          >
            <ArrowLeftRight aria-hidden="true" className="size-4" />
            Compra de divisas
          </button>
        </nav>
      </div>

      <div className="max-w-3xl py-6" role="tabpanel">
        {mode === "capital" ? (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCapitalSubmit}>
            <div>
              <label className={labelClass} htmlFor="capital-currency">Moneda del aporte</label>
              <select className={inputClass} disabled={saving} id="capital-currency" onChange={(event) => setCurrency(event.target.value as Currency)} value={currency}>
                <option value="Bs">Bolívares (Bs)</option>
                <option value="$">Dólares ($)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="capital-amount">Importe aportado</label>
              <input className={inputClass} disabled={saving} id="capital-amount" min="0.01" onChange={(event) => setCapitalAmount(event.target.value)} required step="0.01" type="number" value={capitalAmount} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="capital-description">Concepto <span className="font-normal text-slate-500">(opcional)</span></label>
              <input className={inputClass} disabled={saving} id="capital-description" maxLength={120} onChange={(event) => setCapitalDescription(event.target.value)} placeholder="Aporte inicial, reinversión…" value={capitalDescription} />
            </div>
            <p className="flex items-center gap-2 text-xs leading-5 text-slate-500 sm:col-span-2">
              <LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" />
              El movimiento se registra como inversión y no podrá editarse ni borrarse desde la aplicación.
            </p>
            <button className="h-10 justify-self-start rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:opacity-50 sm:col-span-2" disabled={saving} type="submit">
              Revisar y confirmar aporte
            </button>
          </form>
        ) : (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleExchangeSubmit}>
            <div>
              <label className={labelClass} htmlFor="source-currency">Entregar</label>
              <select className={inputClass} disabled={saving} id="source-currency" onChange={(event) => setSourceCurrency(event.target.value as Currency)} value={sourceCurrency}>
                <option value="Bs">Bolívares (Bs)</option>
                <option value="$">Dólares ($)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="source-amount">Importe origen</label>
              <input className={inputClass} disabled={saving} id="source-amount" min="0.01" onChange={(event) => setSourceAmount(event.target.value)} required step="0.01" type="number" value={sourceAmount} />
            </div>
            <div>
              <label className={labelClass} htmlFor="exchange-rate">Tasa manual ({targetCurrency} por 1 {sourceCurrency})</label>
              <input className={inputClass} disabled={saving} id="exchange-rate" min="0.000001" onChange={(event) => setExchangeRate(event.target.value)} required step="any" type="number" value={exchangeRate} />
            </div>
            <div>
              <label className={labelClass} htmlFor="target-amount">Recibirás (estimado)</label>
              <output className="flex h-10 items-center rounded-lg border border-white/10 bg-slate-950/70 px-3 text-sm font-semibold tabular-nums text-emerald-200" htmlFor="source-amount exchange-rate">
                {formatMinorMoney(previewTargetMinor, targetCurrency)}
              </output>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="exchange-description">Concepto <span className="font-normal text-slate-500">(opcional)</span></label>
              <input className={inputClass} disabled={saving} id="exchange-description" maxLength={120} onChange={(event) => setExchangeDescription(event.target.value)} placeholder="Compra de dólares…" value={exchangeDescription} />
            </div>
            <p className="flex items-center gap-2 text-xs leading-5 text-slate-500 sm:col-span-2">
              <RefreshCw aria-hidden="true" className="size-3.5 shrink-0" />
              Conversión interna con tasa manual; no se consulta ningún servicio externo.
            </p>
            <button className="h-10 justify-self-start rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:opacity-50 sm:col-span-2" disabled={saving} type="submit">
              Revisar y confirmar cambio
            </button>
          </form>
        )}
        {formError && <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200" role="alert">{formError}</p>}
      </div>

      <div className="mt-4 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Libro de movimientos</h3>
            <p className="mt-1 text-xs text-slate-500">Registro cronológico protegido contra edición y borrado en la interfaz.</p>
          </div>
          <div aria-label="Filtrar movimientos" className="flex items-center gap-1 rounded-lg border border-white/10 p-1" role="group">
            {([
              ["all", "Todos"],
              ["investment", "Inversión"],
              ["gain", "Ganancia"],
            ] as const).map(([filter, label]) => (
              <button
                aria-pressed={categoryFilter === filter}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${categoryFilter === filter ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                key={filter}
                onClick={() => setCategoryFilter(filter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200" role="alert">{error}</p>}

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando movimientos…</div>
        ) : filteredEntries.length === 0 ? (
          <div className="border-b border-white/10 py-10 text-center">
            <BadgeCheck aria-hidden="true" className="mx-auto size-7 text-slate-600" />
            <p className="mt-2 text-sm text-slate-400">No hay movimientos para este filtro.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {filteredEntries.map((entry) => {
              const isGain = entry.category === "gain";
              const signedAmount = formatMinorMoney(entry.amountMinor, entry.currency);
              return (
                <article className="flex items-center justify-between gap-4 py-4" key={entry.id}>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${isGain ? "bg-emerald-400/10 text-emerald-300" : "bg-purple-400/10 text-purple-300"}`}>
                      {entry.amountMinor < 0 ? <ArrowUpRight aria-hidden="true" className="size-4" /> : <ArrowDownLeft aria-hidden="true" className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{entry.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {isGain ? "Ganancia" : "Inversión"} · {operationLabel(entry.operation)} · {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold tabular-nums ${entry.amountMinor < 0 ? "text-slate-300" : isGain ? "text-emerald-300" : "text-purple-200"}`}>
                    {entry.amountMinor > 0 ? "+" : ""}{signedAmount}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <section aria-labelledby="finance-confirm-title" aria-modal="true" className="w-full max-w-md rounded-xl border border-purple-500/20 bg-slate-950 p-6 shadow-2xl" role="dialog">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white" id="finance-confirm-title">Confirma este movimiento</h3>
            {pendingAction.kind === "capital" ? (
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Se registrará un aporte irreversible de <strong className="font-semibold text-white">{formatMinorMoney(pendingAction.input.amountMinor, pendingAction.input.currency)}</strong> como inversión.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Se debitarán <strong className="font-semibold text-white">{formatMinorMoney(pendingAction.input.sourceAmountMinor, pendingAction.input.sourceCurrency)}</strong> y se acreditarán <strong className="font-semibold text-white">{formatMinorMoney(pendingAction.input.targetAmountMinor, pendingAction.input.targetCurrency)}</strong>. La operación no puede eliminarse.
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="h-10 rounded-lg border border-white/10 px-4 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50" disabled={saving} onClick={() => setPendingAction(null)} type="button">Volver</button>
              <button className="h-10 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50" disabled={saving} onClick={confirmAction} type="button">
                {saving ? "Guardando…" : "Confirmar movimiento"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function operationLabel(operation: LedgerEntry["operation"]) {
  const labels: Record<LedgerEntry["operation"], string> = {
    capital_contribution: "Aporte de capital",
    project_acquisition: "Adquisición de proyecto",
    sale_capital_return: "Capital recuperado",
    sale_profit: "Resultado de venta",
    currency_exchange: "Cambio de divisas",
  };
  return labels[operation];
}

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Pendiente de fecha";
}