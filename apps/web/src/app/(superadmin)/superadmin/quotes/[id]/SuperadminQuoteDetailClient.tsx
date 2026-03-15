"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

type QuoteDetail = {
  id: string;
  quoteNumber: string;
  status: string;
  totalPrice: number;
  factoryCostTotal: number;
  visionLatamMarkupPct: number;
  partnerMarkupPct: number;
  superadminComment?: string | null;
  reviewedAt?: string | null;
  organizationId: string;
  project?: {
    id: string;
    projectName: string;
    projectCode?: string | null;
    client?: { name: string } | null;
  };
  organization?: { name: string } | null;
  items?: Array<{
    id: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export function SuperadminQuoteDetailClient({ quoteId }: { quoteId: string }) {
  const t = useT();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyTotalPrice, setModifyTotalPrice] = useState("");
  const [modifyVisionLatamPct, setModifyVisionLatamPct] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchQuote() {
      try {
        const res = await fetch(`/api/saas/quotes/${quoteId}`);
        if (!res.ok) {
          if (res.status === 404) setError("Quote not found");
          else setError("Failed to load quote");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setQuote(data);
          setModifyTotalPrice(String(data.totalPrice ?? ""));
          setModifyVisionLatamPct(String(data.visionLatamMarkupPct ?? ""));
        }
      } catch {
        if (!cancelled) setError("Failed to load quote");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchQuote();
    return () => { cancelled = true; };
  }, [quoteId]);

  const patch = async (body: { status?: string; superadminComment?: string | null; totalPrice?: number; visionLatamMarkupPct?: number }) => {
    setActionLoading("patch");
    try {
      const res = await fetch(`/api/saas/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "Failed to update quote");
        return;
      }
      const updated = await res.json();
      setQuote((prev) => (prev ? { ...prev, ...updated } : updated));
      setComment("");
      setModifyOpen(false);
      router.refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = () => {
    patch({ status: "accepted", superadminComment: comment.trim() || undefined });
  };

  const handleReject = () => {
    patch({ status: "rejected", superadminComment: comment.trim() || undefined });
  };

  const handleModifySubmit = () => {
    const total = modifyTotalPrice.trim() ? parseFloat(modifyTotalPrice) : undefined;
    const pct = modifyVisionLatamPct.trim() ? parseFloat(modifyVisionLatamPct) : undefined;
    if (total === undefined && pct === undefined && !comment.trim()) {
      setModifyOpen(false);
      return;
    }
    patch({
      ...(total !== undefined && { totalPrice: total }),
      ...(pct !== undefined && { visionLatamMarkupPct: pct }),
      superadminComment: comment.trim() || undefined,
    });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error || !quote) return <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 font-medium text-foreground">{error ?? "Not found"}</div>;

  const vlCommission = (quote.factoryCostTotal ?? 0) * (quote.visionLatamMarkupPct ?? 0) / 100;
  const basePriceForPartner = (quote.factoryCostTotal ?? 0) * (1 + (quote.visionLatamMarkupPct ?? 0) / 100);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quote data</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Quote number</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{quote.quoteNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Organization</dt>
            <dd className="mt-0.5 text-sm text-foreground">{(quote as { organization?: { name: string } }).organization?.name ?? quote.organizationId}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Project</dt>
            <dd className="mt-0.5 text-sm text-foreground">{quote.project?.projectName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Status</dt>
            <dd className="mt-0.5">
              <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                {quote.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Factory cost</dt>
            <dd className="mt-0.5 text-sm text-foreground">{formatCurrency(quote.factoryCostTotal ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Vision Latam %</dt>
            <dd className="mt-0.5 text-sm text-foreground">{quote.visionLatamMarkupPct ?? 0}%</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">VL commission (amount)</dt>
            <dd className="mt-0.5 text-sm text-foreground">{formatCurrency(vlCommission)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Base price for partner</dt>
            <dd className="mt-0.5 text-sm text-foreground">{formatCurrency(basePriceForPartner)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Total price</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{formatCurrency(quote.totalPrice ?? 0)}</dd>
          </div>
        </dl>
        {quote.superadminComment && (
          <div className="mt-4 pt-4 border-t border-border">
            <dt className="text-xs font-medium text-muted-foreground uppercase">Last superadmin comment</dt>
            <dd className="mt-1 text-sm text-foreground">{quote.superadminComment}</dd>
            {quote.reviewedAt && (
              <dd className="mt-0.5 text-xs text-muted-foreground">
                Reviewed at {new Date(quote.reviewedAt).toLocaleString()}
              </dd>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-2">Comment (optional)</h2>
        <p className="text-sm text-muted-foreground mb-2">Add a comment when approving, rejecting or modifying.</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comment for the partner..."
          className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
          rows={3}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {quote.status !== "accepted" && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={!!actionLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading ? "…" : "Approve"}
          </button>
        )}
        {quote.status !== "rejected" && (
          <button
            type="button"
            onClick={handleReject}
            disabled={!!actionLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {actionLoading ? "…" : "Reject"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setModifyOpen(!modifyOpen)}
          className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
        >
          {modifyOpen ? "Cancel modify" : "Modify"}
        </button>
      </div>

      {modifyOpen && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Modify quote</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Total price</label>
              <input
                type="number"
                value={modifyTotalPrice}
                onChange={(e) => setModifyTotalPrice(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Vision Latam %</label>
              <input
                type="number"
                value={modifyVisionLatamPct}
                onChange={(e) => setModifyVisionLatamPct(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Add a comment above before submitting to record the reason for the change.</p>
          <button
            type="button"
            onClick={handleModifySubmit}
            disabled={!!actionLoading}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {actionLoading ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {quote.items && quote.items.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Unit price</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 text-foreground">{item.description ?? "—"}</td>
                    <td className="py-2 text-right text-foreground">{item.quantity}</td>
                    <td className="py-2 text-right text-foreground">{formatCurrency(item.unitPrice ?? 0)}</td>
                    <td className="py-2 text-right text-foreground">{formatCurrency(item.totalPrice ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
