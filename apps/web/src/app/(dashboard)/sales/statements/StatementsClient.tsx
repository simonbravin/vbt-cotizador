"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getInvoicedAmount } from "@/lib/sales";
import { ArrowLeft, Download, FileText, Mail } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATE_INPUT_FILTER } from "@/lib/ui-filter-classes";
import { saasApiUserFacingMessage } from "@/lib/saas-api-error-message";

const FILTER_ALL_VALUE = "__all__";

type Statement = {
  client: { id: string; name: string };
  sales: any[];
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
};
type Entity = { id: string; name: string; slug: string };

export type StatementsClientProps = {
  /** Platform superadmin: scope statements to this partner org. */
  organizationId?: string;
  backHref?: string;
  /** Base path for sale detail links (e.g. `/superadmin/sales`). */
  saleDetailBasePath?: string;
};

export function StatementsClient({
  organizationId: scopedOrganizationId,
  backHref = "/sales",
  saleDetailBasePath = "/sales",
}: StatementsClientProps = {}) {
  const t = useT();
  const [data, setData] = useState<{ statements: Statement[]; entities: Entity[]; filters: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams();
    if (scopedOrganizationId) params.set("organizationId", scopedOrganizationId);
    if (clientId) params.set("clientId", clientId);
    if (entityId) params.set("entityId", entityId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/sales/statements?${params}`)
      .then(async (r) => {
        try {
          const text = await r.text();
          const d = text ? JSON.parse(text) : null;
          if (!r.ok) {
            const msg = d && typeof d === "object" && "error" in d ? String((d as { error: string }).error) : null;
            setFetchError(msg ?? t("partner.sales.statementsLoadError"));
            setData({ statements: [], entities: [], filters: {} });
            return;
          }
          if (d && typeof d === "object" && Array.isArray((d as { statements?: unknown }).statements)) {
            setData(d as { statements: Statement[]; entities: Entity[]; filters: Record<string, unknown> });
          } else {
            setData({ statements: [], entities: [], filters: {} });
          }
        } catch {
          setFetchError(t("partner.sales.statementsLoadError"));
          setData({ statements: [], entities: [], filters: {} });
        } finally {
          setLoading(false);
        }
      })
      .catch(() => {
        setFetchError(t("partner.sales.statementsLoadError"));
        setData({ statements: [], entities: [], filters: {} });
        setLoading(false);
      });
  }, [clientId, entityId, from, to, scopedOrganizationId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "500" });
    if (scopedOrganizationId) params.set("organizationId", scopedOrganizationId);
    fetch(`/api/clients?${params}`)
      .then(async (r) => {
        try {
          const text = await r.text();
          const d = text ? JSON.parse(text) : {};
          if (Array.isArray(d.clients)) setClients(d.clients);
          else setClients([]);
        } catch {
          setClients([]);
        }
      })
      .catch(() => setClients([]));
  }, [scopedOrganizationId]);

  const exportParams = () => {
    const p = new URLSearchParams();
    if (scopedOrganizationId) p.set("organizationId", scopedOrganizationId);
    if (clientId) p.set("clientId", clientId);
    if (entityId) p.set("entityId", entityId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  };

  const handleExportCsv = () => {
    const params = exportParams();
    params.set("format", "csv");
    window.open(`/api/sales/statements/export?${params}`, "_blank");
  };

  const handleExportPdf = () => {
    const params = exportParams();
    params.set("format", "pdf");
    window.open(`/api/sales/statements/export?${params}`, "_blank");
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/sales/statements/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo.trim(),
          message: emailMessage.trim() || undefined,
          clientId: clientId || undefined,
          entityId: entityId || undefined,
          dateFrom: from || undefined,
          dateTo: to || undefined,
          ...(scopedOrganizationId ? { organizationId: scopedOrganizationId } : {}),
        }),
      });
      const text = await res.text();
      let data: { ok?: boolean; message?: string; error?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }
      if (res.ok && data.ok) {
        const toAddr = emailTo.trim();
        setEmailResult({
          type: "success",
          text: data.message ?? t("partner.sales.emailSentTo", { email: toAddr }),
        });
        setEmailTo("");
        setEmailMessage("");
      } else {
        setEmailResult({ type: "error", text: saasApiUserFacingMessage(data, t, t("partner.sales.failedToSendEmail")) });
      }
    } catch {
      setEmailResult({ type: "error", text: t("partner.sales.failedToSendEmail") });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="w-4 h-4" /> {t("partner.sales.backToSales")}
      </Link>

      {fetchError ? (
        <div className="rounded-lg border border-alert-warningBorder bg-alert-warning px-4 py-2 text-sm text-foreground">{fetchError}</div>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={clientId || FILTER_ALL_VALUE}
          onValueChange={(v) => setClientId(v === FILTER_ALL_VALUE ? "" : v)}
        >
          <SelectTrigger className="min-w-[160px] max-w-[min(100vw-2rem,320px)] border-border/80 bg-background" aria-label={t("partner.sales.allClients")}>
            <SelectValue placeholder={t("partner.sales.allClients")} />
          </SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={6}>
            <SelectItem value={FILTER_ALL_VALUE}>{t("partner.sales.allClients")}</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={entityId || FILTER_ALL_VALUE}
          onValueChange={(v) => setEntityId(v === FILTER_ALL_VALUE ? "" : v)}
        >
          <SelectTrigger className="min-w-[160px] max-w-[min(100vw-2rem,320px)] border-border/80 bg-background" aria-label={t("partner.sales.allEntities")}>
            <SelectValue placeholder={t("partner.sales.allEntities")} />
          </SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={6}>
            <SelectItem value={FILTER_ALL_VALUE}>{t("partner.sales.allEntities")}</SelectItem>
            {(data?.entities ?? []).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={DATE_INPUT_FILTER}
          aria-label={t("partner.sales.dateFrom")}
          title={t("partner.sales.dateFrom")}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={DATE_INPUT_FILTER}
          aria-label={t("partner.sales.dateTo")}
          title={t("partner.sales.dateTo")}
        />
        <Button type="button" onClick={fetchData} className="border border-primary/20">
          {t("partner.sales.apply")}
        </Button>
        <Button type="button" variant="outline" onClick={handleExportCsv} className="gap-1 border-border/60">
          <Download className="w-4 h-4" /> {t("partner.sales.exportCsv")}
        </Button>
        <Button type="button" variant="outline" onClick={handleExportPdf} className="gap-1 border-border/60">
          <FileText className="w-4 h-4" /> {t("partner.sales.exportPdf")}
        </Button>
        <Button type="button" className="gap-1 border border-primary/20" onClick={() => { setEmailOpen(true); setEmailResult(null); }}>
          <Mail className="w-4 h-4" /> {t("partner.sales.sendByEmail")}
        </Button>
      </div>

      {emailOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4" onClick={() => !emailSending && setEmailOpen(false)}>
          <div className="mx-4 w-full max-w-md rounded-lg border border-border/60 bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-semibold tracking-tight text-foreground">{t("partner.sales.emailStatementsTitle")}</h3>
            <p className="mb-3 text-sm text-muted-foreground">{t("partner.sales.emailStatementsHint")}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("partner.sales.emailToLabel")}</label>
                <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder={t("partner.sales.emailToPlaceholder")} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("partner.sales.emailMessageLabel")}</label>
                <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={2} placeholder={t("partner.sales.emailMessagePlaceholder")} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>
              {emailResult && <p className={`text-sm ${emailResult.type === "success" ? "text-primary" : "text-destructive"}`}>{emailResult.text}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => !emailSending && setEmailOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
                {t("common.cancel")}
              </button>
              <button type="button" onClick={handleSendEmail} disabled={emailSending || !emailTo.trim()} className="rounded-lg border border-primary/20 bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {emailSending ? t("partner.sales.sending") : t("partner.sales.send")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t("partner.sales.loading")}</div>
        ) : !data?.statements?.length ? (
          <div className="p-8 text-center text-muted-foreground">{t("partner.sales.noDataForFilters")}</div>
        ) : (
          <div className="p-4 space-y-6">
            {data.statements.map((st) => (
              <div key={st.client.id} className="border border-border/60 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold text-foreground">{st.client.name}</h2>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t("partner.sales.statementSummaryInvoiced")} </span>
                    <span className="font-medium">{formatCurrency(st.totalInvoiced)}</span>
                    <span className="text-muted-foreground ml-3">{t("partner.sales.statementSummaryPaid")} </span>
                    <span className="font-medium">{formatCurrency(st.totalPaid)}</span>
                    <span className="text-muted-foreground ml-3">{t("partner.sales.statementSummaryBalance")} </span>
                    <span className={`font-medium ${st.balance > 0 ? "text-primary" : "text-foreground"}`}>{formatCurrency(st.balance)}</span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-2 pr-4">{t("partner.sales.colSaleNumber")}</th>
                      <th className="pb-2 pr-4">{t("partner.sales.colProject")}</th>
                      <th className="pb-2 pr-4 text-right">{t("partner.sales.colLineInvoiced")}</th>
                      <th className="pb-2 pr-4 text-right">{t("partner.sales.colLinePaid")}</th>
                      <th className="pb-2 text-right">{t("partner.sales.colLineBalance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.sales.map((sale: any) => {
                      const invTotal =
                        typeof sale.statementInvoiced === "number"
                          ? sale.statementInvoiced
                          : getInvoicedAmount(sale);
                      const payTotal =
                        typeof sale.statementPaid === "number"
                          ? sale.statementPaid
                          : sale.payments?.reduce((a: number, p: any) => a + (p.amountUsd ?? 0), 0) ?? 0;
                      return (
                        <tr key={sale.id} className="border-b border-border/40">
                          <td className="py-2 pr-4">
                            <Link href={`${saleDetailBasePath.replace(/\/$/, "")}/${sale.id}`} className="text-primary hover:underline">
                              {sale.saleNumber ?? sale.id?.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-foreground">{sale.project?.name ?? ""}</td>
                          <td className="py-2 pr-4 text-right text-foreground">{formatCurrency(invTotal)}</td>
                          <td className="py-2 pr-4 text-right text-foreground">{formatCurrency(payTotal)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(invTotal - payTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
