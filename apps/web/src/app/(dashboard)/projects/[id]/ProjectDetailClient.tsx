"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Country = { id: string; name: string; code: string };
type Quote = {
  id: string;
  quoteNumber: string | null;
  costMethod: string;
  status: string;
  landedDdpUsd: number;
  createdAt: string;
  country: { name: string } | null;
};

type Project = {
  id: string;
  name: string;
  client: string | null;
  location: string | null;
  countryId: string | null;
  country: { id: string; name: string; code: string } | null;
  description: string | null;
  wallAreaM2S80: number;
  wallAreaM2S150: number;
  wallAreaM2S200: number;
  wallAreaM2Total: number;
  totalKits: number;
  plannedStartDate: string | null;
  durationWeeks: number | null;
  quotes: Quote[];
};

type AuditEntry = { id: string; action: string; createdAt: string; userName: string | null; meta: { changed?: string[] } | null };

export function ProjectDetailClient({ initialProject }: { initialProject: Project }) {
  const [project, setProject] = useState<Project>(initialProject);
  const [editOpen, setEditOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({
    name: project.name,
    client: project.client ?? "",
    location: project.location ?? "",
    countryId: project.countryId ?? "",
    totalKits: project.totalKits,
    wallAreaM2Total: String(project.wallAreaM2Total ?? ""),
    plannedStartDate: project.plannedStartDate ? String(project.plannedStartDate).slice(0, 10) : "",
    durationWeeks: project.durationWeeks != null ? String(project.durationWeeks) : "",
    description: project.description ?? "",
  });

  useEffect(() => {
    fetch(`/api/projects/${project.id}/audit`)
      .then((r) => r.json())
      .then((data) => { setAuditLog(Array.isArray(data) ? data : []); setLoadingAudit(false); })
      .catch(() => setLoadingAudit(false));
  }, [project.id]);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((d) => setCountries(Array.isArray(d) ? d : d.countries ?? []))
      .catch(() => {});
  }, []);

  const openEdit = () => {
    setForm({
      name: project.name,
      client: project.client ?? "",
      location: project.location ?? "",
      countryId: project.countryId ?? "",
      totalKits: project.totalKits,
      wallAreaM2Total: String(project.wallAreaM2Total ?? ""),
      plannedStartDate: project.plannedStartDate ? String(project.plannedStartDate).slice(0, 10) : "",
      durationWeeks: project.durationWeeks != null ? String(project.durationWeeks) : "",
      description: project.description ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        client: form.client || undefined,
        location: form.location || undefined,
        countryId: form.countryId || undefined,
        totalKits: form.totalKits,
        wallAreaM2Total: form.wallAreaM2Total !== "" ? Number(form.wallAreaM2Total) || 0 : undefined,
        plannedStartDate: form.plannedStartDate || null,
        durationWeeks: form.durationWeeks !== "" ? Number(form.durationWeeks) : null,
        description: form.description || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      setEditOpen(false);
      const auditRes = await fetch(`/api/projects/${project.id}/audit`);
      const auditData = await auditRes.json();
      setAuditLog(Array.isArray(auditData) ? auditData : []);
    }
  };

  const formatAction = (action: string, meta: { changed?: string[] } | null) => {
    if (action === "PROJECT_CREATED") return "Project created";
    if (action === "PROJECT_UPDATED" && meta?.changed?.length) return `Updated: ${meta.changed.join(", ")}`;
    return action.replace(/_/g, " ").toLowerCase();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {(project.client || project.location) && (
              <p className="text-gray-500 text-sm">{[project.client, project.location].filter(Boolean).join(" · ")}</p>
            )}
            {(project.plannedStartDate || project.durationWeeks) && (
              <p className="text-gray-400 text-xs mt-0.5">
                {project.plannedStartDate && `Comienzo: ${new Date(project.plannedStartDate).toLocaleDateString()}`}
                {project.plannedStartDate && project.durationWeeks && " · "}
                {project.durationWeeks != null && `Duración: ${project.durationWeeks} semanas`}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openEdit}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <Pencil className="w-4 h-4" /> Edit
        </button>
      </div>

      {/* Project info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Project details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {project.client && (
            <>
              <dt className="text-gray-500">Client</dt>
              <dd className="text-gray-900 font-medium">{project.client}</dd>
            </>
          )}
          {project.location && (
            <>
              <dt className="text-gray-500">Location</dt>
              <dd className="text-gray-900">{project.location}</dd>
            </>
          )}
          <dt className="text-gray-500">Country</dt>
          <dd className="text-gray-900">{project.country?.name ?? project.country?.code ?? "—"}</dd>
          <dt className="text-gray-500">Total kits</dt>
          <dd className="text-gray-900 font-medium">{project.totalKits ?? "—"}</dd>
          <dt className="text-gray-500">Superficie total</dt>
          <dd className="text-gray-900">{(Number(project.wallAreaM2Total) || 0).toFixed(1)} m²</dd>
          {project.plannedStartDate && (
            <>
              <dt className="text-gray-500">Planned start</dt>
              <dd className="text-gray-900">{new Date(project.plannedStartDate).toLocaleDateString()}</dd>
            </>
          )}
          {project.durationWeeks != null && (
            <>
              <dt className="text-gray-500">Duration</dt>
              <dd className="text-gray-900">{project.durationWeeks} weeks</dd>
            </>
          )}
          {project.description && (
            <>
              <dt className="text-gray-500 sm:col-span-1">Description</dt>
              <dd className="text-gray-900 sm:col-span-2">{project.description}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Wall Areas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "S80", value: project.wallAreaM2S80 },
          { label: "S150", value: project.wallAreaM2S150 },
          { label: "S200", value: project.wallAreaM2S200 },
          { label: "Total", value: project.wallAreaM2Total },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase">{s.label} Wall Area</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{(Number(s.value) || 0).toFixed(1)} m²</p>
          </div>
        ))}
      </div>

      {/* Quotes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Quotes ({project.quotes.length})</h2>
          <Link
            href={`/quotes/new?projectId=${project.id}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-vbt-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            <Plus className="w-3.5 h-3.5" /> New Quote
          </Link>
        </div>
        {project.quotes.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No quotes for this project</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {project.quotes.map((q) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-800">{q.quoteNumber ?? q.id.slice(0, 8)}</p>
                  <p className="text-gray-400 text-xs">
                    {q.costMethod} · {q.country?.name ?? "No destination"} · {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{formatCurrency(q.landedDdpUsd)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    q.status === "SENT" ? "bg-green-100 text-green-700" :
                    q.status === "DRAFT" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                  }`}>{q.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Activity / Change log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Activity</h2>
          <p className="text-gray-500 text-xs mt-0.5">Changes and who made them</p>
        </div>
        <div className="p-5">
          {loadingAudit ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : auditLog.length === 0 ? (
            <p className="text-gray-400 text-sm">No activity yet</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {auditLog.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-2 text-gray-700">
                  <span className="font-medium">{entry.userName ?? "System"}</span>
                  <span className="text-gray-500">{formatAction(entry.action, entry.meta)}</span>
                  <span className="text-gray-400 text-xs">{new Date(entry.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-4">Edit project</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-700 mb-1">Project name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Client</label>
                <input value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Country</label>
                <select value={form.countryId} onChange={(e) => setForm((f) => ({ ...f, countryId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="">— Select —</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Total kits</label>
                <input type="number" min={1} value={form.totalKits} onChange={(e) => setForm((f) => ({ ...f, totalKits: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Superficie en m²</label>
                <input type="number" min={0} step="0.01" value={form.wallAreaM2Total} onChange={(e) => setForm((f) => ({ ...f, wallAreaM2Total: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Fecha posible de comienzo</label>
                <input type="date" value={form.plannedStartDate} onChange={(e) => setForm((f) => ({ ...f, plannedStartDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Duración (semanas)</label>
                <input type="number" min={0} value={form.durationWeeks} onChange={(e) => setForm((f) => ({ ...f, durationWeeks: e.target.value }))} placeholder="e.g. 12" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-vbt-blue text-white rounded-lg text-sm hover:bg-blue-900 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
