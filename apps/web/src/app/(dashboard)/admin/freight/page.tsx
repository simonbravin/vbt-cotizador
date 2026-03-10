"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Ship } from "lucide-react";

export default function FreightPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    countryId: "",
    freightPerContainer: 0,
    isDefault: false,
    expiryDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/freight").then(r => r.json()).then(d => setProfiles(Array.isArray(d) ? d : []));
  };

  useEffect(() => {
    load();
    fetch("/api/countries").then(r => r.json()).then(d => setCountries(Array.isArray(d) ? d : []));
  }, []);

  const openAdd = () => {
    setForm({ name: "", countryId: "", freightPerContainer: 0, isDefault: false, expiryDate: "", notes: "" });
    setEditItem(null);
    setShowAdd(true);
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name,
      countryId: p.countryId ?? "",
      freightPerContainer: p.freightPerContainer ?? 0,
      isDefault: p.isDefault ?? false,
      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : "",
      notes: p.notes ?? "",
    });
    setEditItem(p);
    setShowAdd(true);
  };

  const getStatus = (p: { expiryDate?: string | null }) => {
    if (!p.expiryDate) return { label: "Active", className: "bg-green-100 text-green-700" };
    const exp = new Date(p.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp < today ? { label: "Expired", className: "bg-amber-100 text-amber-800" } : { label: "Active", className: "bg-green-100 text-green-700" };
  };

  const save = async () => {
    if (!form.name || !form.countryId) return;
    setSaving(true);
    const payload = { ...form, expiryDate: form.expiryDate ? form.expiryDate : (editItem ? null : undefined) };
    if (editItem) {
      await fetch(`/api/freight/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/freight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowAdd(false);
    load();
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Freight Profiles</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure shipping costs per destination</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm font-medium hover:bg-blue-900"
        >
          <Plus className="w-4 h-4" /> Add Profile
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Profile", "Country", "Cost / Container", "Expiry date", "Status", "Default", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {profiles.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No freight profiles yet</td></tr>
            ) : profiles.map((p) => {
              const status = getStatus(p);
              return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Ship className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">{p.name}</p>
                      {p.notes && <p className="text-gray-400 text-xs truncate max-w-xs">{p.notes}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.country?.name ?? "—"}</td>
                <td className="px-4 py-3 font-medium">
                  {p.freightPerContainer != null ? fmt(p.freightPerContainer) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>{status.label}</span>
                </td>
                <td className="px-4 py-3">
                  {p.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Default</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md m-4">
            <h3 className="font-semibold text-lg mb-4">{editItem ? "Edit Freight Profile" : "Add Freight Profile"}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., FCL to Panama"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                  <select
                    value={form.countryId}
                    onChange={(e) => setForm(p => ({ ...p, countryId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                  >
                    <option value="">— Select —</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost / Container (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={form.freightPerContainer || ""}
                      onChange={(e) => setForm(p => ({ ...p, freightPerContainer: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Carrier offer validity (e.g. 30–60 days)</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g., 40ft HC container"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={form.isDefault}
                    onChange={(e) => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default for this country</label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !form.name || !form.countryId}
                className="px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
