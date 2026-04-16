/** Client-side CSV export for inventory stock lines (Excel-friendly UTF-8 BOM). */

export type InventoryLevelCsvRow = {
  warehouseName: string;
  pieceName: string;
  systemCode: string;
  lengthMm: number;
  quantity: number;
  unit: string;
};

function csvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function downloadInventoryLevelsCsv(rows: InventoryLevelCsvRow[], filenameBase: string): void {
  const headers = ["warehouse", "piece", "system", "length_mm", "quantity", "unit"];
  const body = rows.map((r) =>
    [
      csvCell(r.warehouseName),
      csvCell(r.pieceName),
      csvCell(r.systemCode),
      String(Math.round(Number(r.lengthMm))),
      String(r.quantity),
      csvCell(r.unit),
    ].join(",")
  );
  const bom = "\uFEFF";
  const text = bom + [headers.join(","), ...body].join("\n");
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = filenameBase.replace(/[^\w\-]+/g, "_").slice(0, 80) || "inventory";
  a.download = `${safe}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
