"use client";

import { useState, useEffect, useCallback } from "react";
import { Warehouse, Plus, Pencil, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";

type WarehouseRow = { id: string; name: string; location: string | null; isActive: boolean };

export function InventoryClient() {
  const t = useT();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<WarehouseRow | null>(null);
  const [form, setForm] = useState({ name: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/saas/warehouses")
      .then((r) => r.json())
      .then((data) => setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []))
      .catch(() => setWarehouses([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm({ name: "", location: "" });
    setEditItem(null);
    setShowAdd(true);
  };

  const openEdit = (w: WarehouseRow) => {
    setForm({ name: w.name, location: w.location ?? "" });
    setEditItem(w);
    setShowAdd(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editItem) {
        const res = await fetch(`/api/saas/warehouses/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), location: form.location.trim() || null }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to update");
          return;
        }
      } else {
        const res = await fetch("/api/saas/warehouses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), location: form.location.trim() || null }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to create");
          return;
        }
      }
      setShowAdd(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("common.confirm") || "Confirm?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/saas/warehouses/${id}`, { method: "DELETE" });
      if (res.ok) load();
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm font-medium hover:bg-vbt-blue/90"
        >
          <Plus className="w-4 h-4" /> {t("partner.settings.warehouses")}
        </button>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {warehouses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Warehouse className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">
              {t("common.noData")} {t("partner.settings.warehouses").toLowerCase()}.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-2 text-sm text-vbt-blue hover:underline"
            >
              {t("common.add")}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {warehouses.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{w.name}</p>
                  {w.location && (
                    <p className="text-xs text-gray-500">{w.location}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(w)}
                    className="p-2 text-gray-500 hover:text-vbt-blue"
                    title={t("common.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(w.id)}
                    disabled={saving}
                    className="p-2 text-gray-500 hover:text-red-600"
                    title={t("common.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-lg mb-4">
              {editItem ? t("common.edit") : t("common.add")} {t("partner.settings.warehouses").toLowerCase()}
            </h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {t("common.name")} *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vbt-blue focus:border-vbt-blue"
                placeholder={t("partner.settings.warehouses")}
              />
              <label className="block text-sm font-medium text-gray-700">
                {t("common.notes")} / Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vbt-blue focus:border-vbt-blue"
                placeholder="Location"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm font-medium hover:bg-vbt-blue/90 disabled:opacity-50"
              >
                {saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
