"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

type QuoteRow = {
  id: string;
  quoteNumber: string;
  status: string;
  totalPrice: number;
  factoryCostTotal?: number | null;
  visionLatamMarkupPct?: number | null;
  createdAt: string;
  organization?: { name: string } | null;
  project: {
    id: string;
    projectName: string;
    projectCode?: string | null;
    countryCode?: string | null;
    client?: { name: string } | null;
  };
};

const STATUS_KEYS: Record<string, string> = {
  draft: "quotes.draft",
  sent: "quotes.sent",
  accepted: "quotes.accepted",
  rejected: "quotes.rejected",
  expired: "quotes.expired",
};

export function SuperadminQuotesListClient() {
  const t = useT();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | "">("");

  useEffect(() => {
    let cancelled = false;
    async function fetchQuotes() {
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (statusFilter) params.set("status", statusFilter);
        const res = await fetch(`/api/saas/quotes?${params}`);
        if (!res.ok) {
          setError("Failed to load quotes");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setQuotes(data.quotes ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) setError("Failed to load quotes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchQuotes();
    return () => { cancelled = true; };
  }, [statusFilter]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-foreground">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!statusFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          All
        </button>
        {(["draft", "sent", "accepted", "rejected", "expired"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {t(STATUS_KEYS[s] ?? s)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading quotes…</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">No quotes found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter ? `No quotes with status "${statusFilter}".` : "There are no quotes yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quote
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    VL %
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {quotes.map((q) => {
                  const vlPct = Number(q.visionLatamMarkupPct ?? 0);
                  return (
                    <tr key={q.id} className="hover:bg-muted/50">
                      <td className="px-5 py-3 text-sm text-foreground">
                        {q.organization?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-foreground">
                        {q.quoteNumber}
                      </td>
                      <td className="px-5 py-3 text-sm text-foreground">
                        {q.project?.projectName ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            q.status === "accepted"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : q.status === "rejected"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : q.status === "sent"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t(STATUS_KEYS[q.status] ?? q.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-foreground">
                        {vlPct}%
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-foreground">
                        {formatCurrency(q.totalPrice ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/superadmin/quotes/${q.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          Ver <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && total > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {quotes.length} of {total} quotes
        </p>
      )}
    </div>
  );
}
