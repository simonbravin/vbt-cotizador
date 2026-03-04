"use client";

import { useState, useEffect } from "react";
import { Package, ArrowDown, ArrowUp, RefreshCw, Plus, LayoutGrid, List } from "lucide-react";

type MoveType = "IN" | "OUT" | "ADJUST";

export default function InventoryPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"table" | "cards">("table");

  // Move dialog
  const [moveDialog, setMoveDialog] = useState<any>(null);
  const [moveForm, setMoveForm] = useState({ qty: 0, type: "IN" as MoveType, note: "" });
  const [saving, setSaving] = useState(false);

  // Add item dialog
  const [addDialog, setAddDialog] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [addForm, setAddForm] = useState({ pieceId: "", qtyOnHand: 0 });
  const [addSaving, setAddSaving] = useState(false);

  const reloadItems = (wid: string) => {
    setLoading(true);
    fetch(`/api/inventory?warehouseId=${wid}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => {
    fetch("/api/admin/warehouses")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setWarehouses(list);
        if (list.length > 0) setWarehouseId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!warehouseId) return;
    reloadItems(warehouseId);
  }, [warehouseId]);

  // Catalog search for add dialog
  useEffect(() => {
    if (!addDialog) return;
    if (catalogSearch.trim().length < 2) { setCatalog([]); return; }
    const ctrl = new AbortController();
    fetch("/api/catalog?q=" + encodeURIComponent(catalogSearch), { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setCatalog(Array.isArray(d) ? d : d.items ?? []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [catalogSearch, addDialog]);

  const openMove = (item: any, type: MoveType) => {
    setMoveDialog(item);
    setMoveForm({ qty: 0, type, note: "" });
  };

  const submitMove = async () => {
    if (!moveDialog || moveForm.qty <= 0) return;
    setSaving(true);
    await fetch(`/api/inventory/${moveDialog.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(moveForm),
    });
    setSaving(false);
    setMoveDialog(null);
    reloadItems(warehouseId);
  };

  const submitAddItem = async () => {
    if (!addForm.pieceId || !warehouseId) return;
    setAddSaving(true);
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId, pieceId: addForm.pieceId, qtyOnHand: addForm.qtyOnHand }),
    });
    setAddSaving(false);
    setAddDialog(false);
    setAddForm({ pieceId: "", qtyOnHand: 0 });
    setCatalogSearch("");
    reloadItems(warehouseId);
  };

  const SYSTEM_COLORS: Record<string, string> = {
    S80: "bg-blue-100 text-blue-700",
    S150: "bg-purple-100 text-purple-700",
    S200: "bg-green-100 text-green-700",
  };
  const SYSTEM_LABELS: Record<string, string> = {
    S80: "VBT 80mm",
    S150: "VBT 150mm",
    S200: "VBT 200mm",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage stock levels per warehouse</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
          >
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("table")}
              title="Table view"
              className={`p-2 transition-colors ${view === "table" ? "bg-vbt-blue text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("cards")}
              title="Card view"
              className={`p-2 transition-colors ${view === "cards" ? "bg-vbt-blue text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { setAddDialog(true); setCatalogSearch(""); setAddForm({ pieceId: "", qtyOnHand: 0 }); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm font-medium hover:bg-blue-900"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === "table" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Piece", "System", "On Hand", "Reserved", "Available", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No inventory items. Use "Add Item" to create stock.</td></tr>
                ) : items.map((item) => {
                  const available = item.qtyOnHand - item.qtyReserved;
                  const sysCode = item.piece?.systemCode;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-800 text-xs max-w-xs truncate">{item.piece?.canonicalName}</p>
                            <p className="text-gray-400 text-xs">{item.piece?.dieNumber ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {sysCode ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SYSTEM_COLORS[sysCode] ?? "bg-gray-100 text-gray-600"}`}>
                            {SYSTEM_LABELS[sysCode] ?? sysCode}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{item.qtyOnHand.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{item.qtyReserved.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={available < 0 ? "text-red-600 font-semibold" : "text-green-700 font-medium"}>
                          {available.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openMove(item, "IN")} title="Receive stock" className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openMove(item, "OUT")} title="Dispatch stock" className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openMove(item, "ADJUST")} title="Adjust stock" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards view */}
      {view === "cards" && (
        <div>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No inventory items. Use "Add Item" to create stock.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const available = item.qtyOnHand - item.qtyReserved;
                const sysCode = item.piece?.systemCode;
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      {sysCode && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SYSTEM_COLORS[sysCode] ?? "bg-gray-100 text-gray-600"}`}>
                          {SYSTEM_LABELS[sysCode] ?? sysCode}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 text-sm truncate">{item.piece?.canonicalName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.piece?.dieNumber ?? "—"}</p>
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-gray-400">On Hand</p>
                        <p className="font-semibold text-gray-800">{item.qtyOnHand.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Reserved</p>
                        <p className="font-semibold text-amber-600">{item.qtyReserved.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Available</p>
                        <p className={`font-semibold ${available < 0 ? "text-red-600" : "text-green-700"}`}>{available.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openMove(item, "IN")} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg">
                        <ArrowDown className="w-3 h-3" /> In
                      </button>
                      <button onClick={() => openMove(item, "OUT")} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                        <ArrowUp className="w-3 h-3" /> Out
                      </button>
                      <button onClick={() => openMove(item, "ADJUST")} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg">
                        <RefreshCw className="w-3 h-3" /> Adj
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Move dialog */}
      {moveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm m-4">
            <h3 className="font-semibold text-lg mb-1">
              {moveForm.type === "IN" ? "Receive Stock" : moveForm.type === "OUT" ? "Dispatch Stock" : "Adjust Stock"}
            </h3>
            <p className="text-gray-500 text-sm mb-4 truncate">{moveDialog.piece?.canonicalName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (linear m) *</label>
                <input
                  type="number" min="0.1" step="0.1"
                  value={moveForm.qty || ""}
                  onChange={(e) => setMoveForm(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input
                  type="text" value={moveForm.note}
                  onChange={(e) => setMoveForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="e.g., PO#12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setMoveDialog(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={submitMove} disabled={saving || moveForm.qty <= 0} className="px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item dialog */}
      {addDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md m-4">
            <h3 className="font-semibold text-lg mb-4">Add Inventory Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Piece *</label>
                <input
                  type="text"
                  placeholder="Type piece name or code..."
                  value={catalogSearch}
                  onChange={(e) => { setCatalogSearch(e.target.value); setAddForm(p => ({ ...p, pieceId: "" })); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                />
                {catalog.length > 0 && !addForm.pieceId && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                    {catalog.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => { setAddForm(p => ({ ...p, pieceId: c.id })); setCatalogSearch(c.canonicalName ?? c.description ?? c.id); setCatalog([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-800">{c.canonicalName ?? c.description}</span>
                        {c.systemCode && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${SYSTEM_COLORS[c.systemCode] ?? "bg-gray-100 text-gray-600"}`}>
                            {SYSTEM_LABELS[c.systemCode] ?? c.systemCode}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity (linear m)</label>
                <input
                  type="number" min="0" step="0.1"
                  value={addForm.qtyOnHand || ""}
                  onChange={(e) => setAddForm(p => ({ ...p, qtyOnHand: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setAddDialog(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button
                onClick={submitAddItem}
                disabled={addSaving || !addForm.pieceId}
                className="px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm disabled:opacity-50"
              >
                {addSaving ? "Adding..." : "Add to Inventory"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
