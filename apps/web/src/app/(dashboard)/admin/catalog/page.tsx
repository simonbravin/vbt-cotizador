"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Upload, Edit } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const CATALOG_SYSTEMS = ["S80", "S150", "S200"] as const;
type CatalogSystemCode = (typeof CATALOG_SYSTEMS)[number];

const defaultSystemFilters = (): Record<CatalogSystemCode, boolean> => ({
  S80: true,
  S150: true,
  S200: true,
});

export default function CatalogPage() {
  const t = useT();
  const [pieces, setPieces] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [systemOn, setSystemOn] = useState<Record<CatalogSystemCode, boolean>>(defaultSystemFilters);
  const [loading, setLoading] = useState(true);
  const [importDialog, setImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [editPiece, setEditPiece] = useState<any>(null);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    const enabled = CATALOG_SYSTEMS.filter((c) => systemOn[c]);
    if (enabled.length === 0) {
      setPieces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (enabled.length < CATALOG_SYSTEMS.length) {
      params.set("systems", enabled.join(","));
    }
    if (incompleteOnly) params.set("incomplete", "1");
    fetch(`/api/catalog?${params}`)
      .then(async (r) => {
        let list: unknown[] = [];
        try {
          const d = await r.json();
          if (Array.isArray(d)) list = d;
        } catch {
          /* invalid JSON */
        }
        setPieces(list);
        setLoading(false);
      })
      .catch(() => {
        setPieces([]);
        setLoading(false);
      });
  }, [search, systemOn, incompleteOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleImport = async (dryRun: boolean) => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/catalog/import?dryRun=${dryRun}`, { method: "POST", body: fd });
    const data = await res.json();
    setImportResult({ ...data, dryRun });
    setImporting(false);
    if (!dryRun) load();
  };

  const saveEdit = async () => {
    if (!editPiece) return;
    await fetch(`/api/catalog/${editPiece.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pricePerM2Cored: editPiece._costEdit ?? editPiece.costs?.[0]?.pricePerM2Cored,
        usefulWidthMm: editPiece.usefulWidthMm,
        isActive: editPiece.isActive,
      }),
    });
    setEditPiece(null);
    load();
  };

  const SYS_COLORS: Record<string, string> = {
    S80: "bg-blue-100 text-blue-700",
    S150: "bg-green-100 text-green-700",
    S200: "bg-purple-100 text-purple-700",
  };
  const SYS_LABELS: Record<string, string> = useMemo(
    () => ({
      S80: t("admin.catalog.s80"),
      S150: t("admin.catalog.s150"),
      S200: t("admin.catalog.s200"),
    }),
    [t]
  );
  const tableColumns = useMemo(
    () =>
      [
        { key: "die", label: t("admin.catalog.dieNumber"), align: "left" as const },
        { key: "name", label: t("admin.catalog.canonicalName"), align: "left" as const },
        { key: "system", label: t("admin.catalog.system"), align: "center" as const },
        { key: "width", label: t("admin.catalog.usefulWidthMm"), align: "center" as const },
        { key: "lbs", label: t("admin.catalog.lbsPerMCored"), align: "center" as const },
        { key: "kg", label: t("admin.catalog.kgPerMCored"), align: "center" as const },
        { key: "price", label: t("admin.catalog.pricePerMCored"), align: "center" as const },
        { key: "active", label: t("admin.catalog.active"), align: "center" as const },
        { key: "actions", label: t("admin.catalog.actions"), align: "center" as const },
      ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("admin.catalog.title")}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pieces.length} {t("admin.catalog.pieces")}</p>
        </div>
        <button
          onClick={() => setImportDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-vbt-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          <Upload className="w-4 h-4" /> {t("admin.catalog.import")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("admin.catalog.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={incompleteOnly}
            onChange={(e) => setIncompleteOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>{t("admin.catalog.incompleteOnly")}</span>
        </label>
        <p className="text-xs text-gray-500 w-full sm:w-auto">{t("admin.catalog.incompleteOnlyHint")}</p>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t("admin.catalog.system")}
        >
          {CATALOG_SYSTEMS.map((code) => {
            const on = systemOn[code];
            const onClass =
              code === "S80"
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : code === "S150"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-purple-100 text-purple-800 border-purple-300";
            const offClass = "bg-white text-gray-500 border-gray-200 hover:bg-gray-50";
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => setSystemOn((prev) => ({ ...prev, [code]: !prev[code] }))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${on ? onClass : offClass}`}
              >
                {SYS_LABELS[code] ?? code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap ${col.align === "center" ? "text-center" : "text-left"}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">{t("common.loading")}</td></tr>
              ) : CATALOG_SYSTEMS.every((c) => !systemOn[c]) ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                    {t("admin.catalog.enableOneSystem")}
                  </td>
                </tr>
              ) : pieces.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${!p.isActive ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2.5 text-left text-gray-400 text-xs">{p.dieNumber ?? "—"}</td>
                  <td className="px-3 py-2.5 text-left font-medium text-gray-800 max-w-xs truncate">{p.canonicalName}</td>
                  <td className="px-3 py-2.5 text-center">
                    {p.systemCode ? (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${SYS_COLORS[p.systemCode] ?? "bg-gray-100"}`}>
                        {SYS_LABELS[p.systemCode] ?? p.systemCode}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{p.usefulWidthMm?.toFixed(1) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{p.lbsPerMCored?.toFixed(3) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{p.kgPerMCored?.toFixed(3) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center font-medium tabular-nums">
                    {p.costs?.[0]?.pricePerM2Cored
                      ? `$${p.costs[0].pricePerM2Cored.toFixed(2)}`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.isActive ? t("admin.catalog.active") : t("admin.catalog.inactive")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => setEditPiece({ ...p, _costEdit: p.costs?.[0]?.pricePerM2Cored ?? 0 })}
                      className="inline-flex p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Dialog */}
      {importDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg m-4">
            <h3 className="font-semibold text-lg mb-4">{t("admin.catalog.importTitle")}</h3>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-vbt-blue file:text-white hover:file:bg-blue-900"
            />
            {importResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-1">
                <p className="font-medium">{importResult.dryRun ? t("admin.catalog.dryRunPreview") : t("admin.catalog.importComplete")}</p>
                <p className="text-green-700">{t("admin.catalog.created")}: {importResult.created}</p>
                <p className="text-blue-700">{t("admin.catalog.updated")}: {importResult.updated}</p>
                <p className="text-gray-500">{t("admin.catalog.unchanged")}: {importResult.unchanged}</p>
                <p className="text-gray-500">{t("admin.catalog.total")}: {importResult.total}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => { setImportDialog(false); setImportResult(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">{t("common.cancel")}</button>
              <button onClick={() => handleImport(true)} disabled={importing} className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50">
                {importing ? "..." : t("admin.catalog.dryRun")}
              </button>
              <button onClick={() => handleImport(false)} disabled={importing} className="px-4 py-2 bg-vbt-orange text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                {importing ? t("admin.catalog.importing") : t("admin.catalog.importNow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Piece Dialog */}
      {editPiece && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md m-4">
            <h3 className="font-semibold text-lg mb-4">{t("admin.catalog.editPiece")}</h3>
            <p className="text-gray-500 text-sm mb-4">{editPiece.canonicalName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("admin.catalog.pricePerM")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPiece._costEdit}
                  onChange={(e) => setEditPiece((p: any) => ({ ...p, _costEdit: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("admin.catalog.usefulWidth")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={editPiece.usefulWidthMm ?? 0}
                  onChange={(e) => setEditPiece((p: any) => ({ ...p, usefulWidthMm: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setEditPiece(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">{t("common.cancel")}</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm hover:bg-blue-900">{t("common.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
