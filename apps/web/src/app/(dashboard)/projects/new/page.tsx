"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Country = { id: string; name: string; code: string };

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({
    name: "",
    client: "",
    location: "",
    countryId: "" as string,
    totalKits: 1,
    description: "",
  });

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => setCountries(Array.isArray(data) ? data : data.countries ?? []))
      .catch(() => setCountries([]));
  }, []);

  const update = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        countryId: form.countryId || undefined,
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create project"); return; }
      router.push(`/projects/${data.id}`);
    } catch { setError("An unexpected error occurred."); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Project</h1>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {[
          { key: "name", label: "Project Name *", type: "text", placeholder: "e.g., Residencial Las Palmas" },
          { key: "client", label: "Client", type: "text", placeholder: "Client name" },
          { key: "location", label: "Location", type: "text", placeholder: "City, region" },
        ].map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={(form as any)[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <select
            value={form.countryId}
            onChange={(e) => update("countryId", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue bg-white"
          >
            <option value="">— Select country —</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total kits</label>
          <input
            type="number"
            min={1}
            value={form.totalKits}
            onChange={(e) => update("totalKits", parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue"
          />
          <p className="text-xs text-gray-500 mt-0.5">e.g. 1 for single project (school), 100 for development (100 houses)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Optional project description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/projects" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-vbt-blue text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
