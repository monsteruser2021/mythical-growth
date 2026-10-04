import * as XLSX from "xlsx";

export type ExcelColumn<Row> = {
  header: string;
  value: (row: Row) => string | number | Date | null | undefined;
  numberFormat?: string | ((row: Row) => string);
  width?: number;
};

export function exportToExcel<Row>(
  rows: readonly Row[],
  filename: string,
  sheetName: string,
  columns: readonly ExcelColumn<Row>[],
) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => column.value(row) ?? "")),
  ], { cellDates: true });

  worksheet["!cols"] = columns.map((column) => ({ wch: column.width ?? 18 }));
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: Math.max(columns.length - 1, 0) },
    }),
  };

  rows.forEach((row, rowIndex) => {
    columns.forEach((column, columnIndex) => {
      if (!column.numberFormat) return;
      const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
      const cell = worksheet[address];
      if (cell) {
        cell.z = typeof column.numberFormat === "function"
          ? column.numberFormat(row)
          : column.numberFormat;
      }
    });
  });

  const workbook = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[\\/?*:[\]]/g, " ").slice(0, 31) || "Report";
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  XLSX.writeFile(workbook, filename, { compression: true });
}

export function reportFilename(prefix: string, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return `${prefix}-${date}.xlsx`;
}
