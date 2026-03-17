"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Warehouse, Plus, Package, ArrowRightLeft, Search, Settings } from "lucide-react";
import { useT } from "@/lib/i18n/context";

type WarehouseRow = { id: string; name: string; location: string | null; countryCode?: string | null; address?: string | null; managerName?: string | null; contactPhone?: string | null; contactEmail?: string | null; isActive: boolean };
type LevelRow = {
  id: string;
  quantity: number;
  unit: string | null;
  warehouse: { id: string; name: string };
  catalogPiece: { id: string; canonicalName: string; systemCode: string };
};
type CatalogPieceRow = { id: string; canonicalName: string; systemCode: string };
type TxRow = {
  id: string;
  quantityDelta: number;
  type: string;
  createdAt: string;
  warehouse: { name: string };
  catalogPiece: { canonicalName: string; systemCode: string };
};

const TX_TYPES: { value: string; label: string }[] = [
  { value: "purchase_in", label: "Entrada (compra)" },
  { value: "project_surplus", label: "Sobrante proyecto" },
  { value: "adjustment_in", label: "Ajuste entrada" },
  { value: "sale_out", label: "Salida (venta)" },
  { value: "project_consumption", label: "Consumo proyecto" },
  { value: "adjustment_out", label: "Ajuste salida" },
];

export function InventoryClient() {
  const t = useT();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [catalogPieces, setCatalogPieces] = useState<CatalogPieceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [txForm, setTxForm] = useState({ warehouseId: "", catalogPieceId: "", quantityDelta: 0, type: "purchase_in", notes: "", referenceProjectId: "" });
  const [txSaving, setTxSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/saas/warehouses")
      .then((r) => r.json())
      .then((data) => setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []))
      .catch(() => setWarehouses([]))
      .finally(() => setLoading(false));
  }, []);

  const loadLevels = useCallback(() => {
    setLoadingLevels(true);
    fetch("/api/saas/inventory/levels?limit=300")
      .then((r) => r.json())
      .then((data) => setLevels(data.levels ?? []))
      .catch(() => setLevels([]))
      .finally(() => setLoadingLevels(false));
  }, []);

  const loadTransactions = useCallback(() => {
    fetch("/api/saas/inventory/transactions?limit=50")
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]));
  }, []);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data) => setCatalogPieces(Array.isArray(data) ? data : []))
      .catch(() => setCatalogPieces([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading) {
      loadLevels();
      loadTransactions();
    }
  }, [loading, loadLevels, loadTransactions]);

  const handleCreateTransaction = () => {
    if (!txForm.warehouseId || !txForm.catalogPieceId || txForm.quantityDelta === 0) return;
    const delta = ["sale_out", "project_consumption", "adjustment_out"].includes(txForm.type)
      ? -Math.abs(txForm.quantityDelta)
      : Math.abs(txForm.quantityDelta);
    setTxSaving(true);
    setError(null);
    fetch("/api/saas/inventory/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouseId: txForm.warehouseId,
        catalogPieceId: txForm.catalogPieceId,
        quantityDelta: delta,
        type: txForm.type,
        notes: txForm.notes || undefined,
        referenceProjectId: txForm.referenceProjectId.trim() || undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error ?? "Error"); });
        return r.json();
      })
      .then(() => {
        setTxForm((f) => ({ ...f, quantityDelta: 0, notes: "", referenceProjectId: "" }));
        loadLevels();
        loadTransactions();
      })
      .catch((e) => setError(e.message ?? "Error al crear transacción"))
      .finally(() => setTxSaving(false));
  };

  const filteredLevels = useMemo(() => {
    if (!searchFilter.trim()) return levels;
    const q = searchFilter.trim().toLowerCase();
    return levels.filter(
      (l) =>
        l.warehouse.name.toLowerCase().includes(q) ||
        (l.catalogPiece?.canonicalName ?? "").toLowerCase().includes(q) ||
        (l.catalogPiece?.systemCode ?? "").toLowerCase().includes(q)
    );
  }, [levels, searchFilter]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("partner.settings.warehouses")} — {t("common.readOnly") ?? "Solo lectura"}
        </p>
        <Link
          href="/settings/warehouses"
          className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-sm font-medium text-foreground hover:bg-muted"
        >
          <Settings className="w-4 h-4" /> {t("partner.settings.configureWarehouses") ?? "Configurar bodegas"}
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {warehouses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Warehouse className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">
              {t("common.noData")} {t("partner.settings.warehouses").toLowerCase()}.
            </p>
            <p className="text-sm mt-1">
              <Link href="/settings/warehouses" className="text-primary hover:underline">
                {t("partner.settings.configureWarehouses") ?? "Configurar bodegas en Ajustes"}
              </Link>
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {warehouses.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{w.name}</p>
                  {w.location && <p className="text-xs text-muted-foreground">{w.location}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4" /> Stock por bodega
          </h3>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("admin.inventory.filterPlaceholder")}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-input bg-background text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddItemForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t("admin.inventory.addItem")}
          </button>
        </div>
        {loadingLevels ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Bodega</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Pieza</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Sistema</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredLevels.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {levels.length === 0
                        ? t("admin.inventory.noItemsAddOne")
                        : "Ningún resultado con el filtro."}
                    </td>
                  </tr>
                ) : (
                  filteredLevels.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2 text-sm text-foreground">{l.warehouse.name}</td>
                      <td className="px-4 py-2 text-sm text-foreground">{l.catalogPiece.canonicalName}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{l.catalogPiece.systemCode}</td>
                      <td className="px-4 py-2 text-sm text-right text-foreground">{l.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddItemForm && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> {t("admin.inventory.addItem")} — solo piezas del catálogo
            </h3>
            <button
              type="button"
              onClick={() => setShowAddItemForm(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("admin.inventory.close")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Elegí bodega y pieza del catálogo; tipo y cantidad definen entrada o salida.
          </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Bodega</label>
            <select
              value={txForm.warehouseId}
              onChange={(e) => setTxForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm min-w-[140px]"
            >
              <option value="">—</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Pieza</label>
            <select
              value={txForm.catalogPieceId}
              onChange={(e) => setTxForm((f) => ({ ...f, catalogPieceId: e.target.value }))}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm min-w-[160px]"
            >
              <option value="">—</option>
              {catalogPieces.map((p) => (
                <option key={p.id} value={p.id}>{p.canonicalName} ({p.systemCode})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Tipo</label>
            <select
              value={txForm.type}
              onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value }))}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm min-w-[140px]"
            >
              {TX_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Cantidad</label>
            <input
              type="number"
              min={0}
              step="any"
              value={txForm.quantityDelta || ""}
              onChange={(e) => setTxForm((f) => ({ ...f, quantityDelta: Number(e.target.value) || 0 }))}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm w-20"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">ID Proyecto (opc.)</label>
            <input
              type="text"
              value={txForm.referenceProjectId}
              onChange={(e) => setTxForm((f) => ({ ...f, referenceProjectId: e.target.value }))}
              placeholder="Opcional"
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm w-36"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notas</label>
            <input
              type="text"
              value={txForm.notes}
              onChange={(e) => setTxForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Opcional"
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm w-32"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateTransaction}
            disabled={txSaving || !txForm.warehouseId || !txForm.catalogPieceId || txForm.quantityDelta === 0}
            className="rounded-lg px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {txSaving ? t("common.saving") : "Aplicar"}
          </button>
        </div>
        {transactions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Últimos movimientos</h4>
            <ul className="space-y-1 text-sm">
              {transactions.slice(0, 10).map((tx) => (
                <li key={tx.id} className="flex flex-wrap gap-2 text-foreground">
                  <span className="font-medium">{tx.warehouse.name}</span>
                  <span>{tx.catalogPiece.canonicalName}</span>
                  <span className={tx.quantityDelta >= 0 ? "text-green-600" : "text-red-600"}>{tx.quantityDelta >= 0 ? "+" : ""}{tx.quantityDelta}</span>
                  <span className="text-muted-foreground text-xs">{tx.type}</span>
                  <span className="text-muted-foreground text-xs">{new Date(tx.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
