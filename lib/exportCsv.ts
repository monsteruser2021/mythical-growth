export type CsvColumn<Row> = {
  header: string;
  value: (row: Row) => string | number | null | undefined;
};

function escapeCsvValue(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);

  if (typeof value === "string" && /^[\s]*[=+@\-\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function exportToCSV<Row>(
  rows: readonly Row[],
  filename: string,
  columns: readonly CsvColumn<Row>[],
) {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const records = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))).join(","),
  );
  const csv = `\uFEFF${[header, ...records].join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function reportFilename(prefix: string, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return `${prefix}-${date}.csv`;
}