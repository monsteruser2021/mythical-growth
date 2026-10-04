"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { exportToExcel, reportFilename, type ExcelColumn } from "@/lib/exportExcel";

type ExportExcelButtonProps<Row> = {
  rows: readonly Row[];
  columns: readonly ExcelColumn<Row>[];
  filenamePrefix: string;
  sheetName: string;
  label: string;
  disabled?: boolean;
  disabledLabel?: string;
  onSuccess: () => void;
};

export default function ExportExcelButton<Row>({
  rows,
  columns,
  filenamePrefix,
  sheetName,
  label,
  disabled = false,
  disabledLabel = "Cargando datos…",
  onSuccess,
}: ExportExcelButtonProps<Row>) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setExporting(true);
    setError("");

    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      exportToExcel(rows, reportFilename(filenamePrefix), sheetName, columns);
      onSuccess();
    } catch {
      setError("No se pudo generar el archivo Excel. Inténtalo de nuevo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-purple-400/25 bg-purple-500/5 px-3 text-xs font-medium text-purple-100 transition-colors hover:border-purple-300/50 hover:bg-purple-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || exporting}
        onClick={handleExport}
        type="button"
      >
        {exporting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Download aria-hidden="true" className="size-4" />
        )}
        {exporting ? "Generando Excel…" : disabled ? disabledLabel : label}
      </button>
      {error && <p className="text-xs text-rose-300" role="alert">{error}</p>}
      <span aria-live="polite" className="sr-only">
        {exporting ? "Generando archivo Excel" : ""}
      </span>
    </div>
  );
}
