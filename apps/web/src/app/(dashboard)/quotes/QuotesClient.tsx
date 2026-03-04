"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Quote = {
  id: string;
  quoteNumber: string | null;
  status: string;
  costMethod: string;
  landedDdpUsd: number;
  createdAt: Date | string;
  project: { name: string; client: string | null };
  country: { name: string; code: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-green-100 text-green-700",
  DRAFT: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-500",
};

export function QuotesClient({ quotes }: { quotes: Quote[] }) {
  const [view, setView] = useState<"table" | "cards">("table");

  return (
    <div>
      <div className="flex justify-end mb-4">
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
      </div>

      {view === "table" ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Quote #", "Project", "Destination", "Method", "Landed DDP", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`} className="font-medium text-vbt-blue hover:underline">
                      {q.quoteNumber ?? q.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{q.project.name}</p>
                    {q.project.client && <p className="text-gray-400 text-xs">{q.project.client}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {q.country?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{q.costMethod}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {formatCurrency(q.landedDdpUsd)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[q.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {quotes.map((q) => (
            <Link
              key={q.id}
              href={`/quotes/${q.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-vbt-orange" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[q.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {q.status}
                </span>
              </div>
              <p className="font-semibold text-vbt-blue text-sm">
                {q.quoteNumber ?? q.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="font-medium text-gray-800 mt-1">{q.project.name}</p>
              {q.project.client && <p className="text-gray-400 text-xs mt-0.5">{q.project.client}</p>}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">{q.country?.name ?? "—"}</span>
                <span className="text-sm font-bold text-gray-800">{formatCurrency(q.landedDdpUsd)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
