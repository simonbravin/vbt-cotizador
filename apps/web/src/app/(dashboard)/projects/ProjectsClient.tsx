"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderOpen, MapPin, User, LayoutGrid, List } from "lucide-react";

type Project = {
  id: string;
  name: string;
  client: string | null;
  location: string | null;
  wallAreaM2S80: number;
  wallAreaM2S150: number;
  wallAreaM2S200: number;
  _count: { quotes: number };
};

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView("cards")}
            title="Card view"
            className={`p-2 transition-colors ${view === "cards" ? "bg-vbt-blue text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("table")}
            title="Table view"
            className={`p-2 transition-colors ${view === "table" ? "bg-vbt-blue text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === "cards" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {p._count.quotes} quote{p._count.quotes !== 1 ? "s" : ""}
                </span>
              </div>
              <h3 className="font-semibold text-gray-800">{p.name}</h3>
              {p.client && (
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                  <User className="w-3.5 h-3.5" />
                  {p.client}
                </div>
              )}
              {p.location && (
                <div className="flex items-center gap-1.5 text-gray-400 text-sm mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {p.location}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                <span>VBT 80mm: {p.wallAreaM2S80.toFixed(0)} m²</span>
                <span>VBT 150mm: {p.wallAreaM2S150.toFixed(0)} m²</span>
                <span>VBT 200mm: {p.wallAreaM2S200.toFixed(0)} m²</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Project", "Client", "Location", "VBT 80mm", "VBT 150mm", "VBT 200mm", "Quotes"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="font-medium text-vbt-blue hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.client ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{p.location ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.wallAreaM2S80.toFixed(0)} m²</td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.wallAreaM2S150.toFixed(0)} m²</td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.wallAreaM2S200.toFixed(0)} m²</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{p._count.quotes}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
