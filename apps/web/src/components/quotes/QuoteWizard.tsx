"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { FilterSelect } from "@/components/ui/filter-select";
import { saasApiUserFacingMessage } from "@/lib/saas-api-error-message";
import { initialQuoteWizardState, type QuoteWizardState } from "@/components/quotes/wizard-types";

type ProjectOpt = {
  id: string;
  projectName?: string;
  projectCode?: string | null;
  countryCode?: string | null;
};
type WarehouseOpt = { id: string; name: string };
type CatalogPieceOpt = { id: string; canonicalName: string; systemCode: string; dieNumber?: string | null };
type CountryOpt = { id: string; code: string; name: string };
type FreightProfileOpt = {
  id: string;
  name: string;
  freightPerContainer: number;
  country?: { code?: string; name?: string };
};

const STEPS = [
  { num: 1, labelKey: "quotes.stepMethod" as const },
  { num: 2, labelKey: "quotes.stepImport" as const },
  { num: 3, labelKey: "quotes.stepMaterial" as const },
  { num: 4, labelKey: "quotes.stepCommission" as const },
  { num: 5, labelKey: "quotes.stepDestination" as const },
  { num: 6, labelKey: "quotes.stepPreview" as const },
];

type PreviewState = {
  loading: boolean;
  error: string | null;
  data: Record<string, unknown> | null;
};

export function QuoteWizard() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isSuperadmin = !!(session?.user as { isPlatformSuperadmin?: boolean } | undefined)?.isPlatformSuperadmin;

  const [step, setStep] = useState(1);
  const [state, setState] = useState<QuoteWizardState>(() => initialQuoteWizardState());
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOpt[]>([]);
  const [countries, setCountries] = useState<CountryOpt[]>([]);
  const [freightProfiles, setFreightProfiles] = useState<FreightProfileOpt[]>([]);
  const [quoteDefaults, setQuoteDefaults] = useState<{
    effectiveRateS80: number;
    effectiveRateS150: number;
    effectiveRateS200: number;
    baseUom: string;
    containerCapacityM3?: number;
    defaultPartnerMarkupPct?: number;
    partnerMarkupMinPct?: number | null;
    partnerMarkupMaxPct?: number | null;
  } | null>(null);
  const [catalogPieces, setCatalogPieces] = useState<CatalogPieceOpt[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importLinesOpen, setImportLinesOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ loading: false, error: null, data: null });
  const previewReq = useRef(0);

  const update = useCallback((patch: Partial<QuoteWizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const projectIdFromQuery = searchParams.get("projectId");

  useEffect(() => {
    if (projectIdFromQuery) {
      const p = projects.find((x) => x.id === projectIdFromQuery);
      const cc =
        p?.countryCode && String(p.countryCode).trim().length === 2
          ? String(p.countryCode).trim().toUpperCase()
          : "";
      update({
        projectId: projectIdFromQuery,
        ...(cc ? { destinationCountryCode: cc } : {}),
      });
    }
  }, [projectIdFromQuery, projects, update]);

  useEffect(() => {
    fetch("/api/saas/projects?limit=200")
      .then(async (r) => {
        if (!r.ok) return [];
        try {
          const d = await r.json();
          return Array.isArray(d?.projects) ? d.projects : [];
        } catch {
          return [];
        }
      })
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    fetch("/api/saas/warehouses")
      .then(async (r) => {
        if (!r.ok) return [];
        try {
          const d = await r.json();
          return Array.isArray(d?.warehouses) ? d.warehouses : [];
        } catch {
          return [];
        }
      })
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    fetch("/api/countries")
      .then(async (r) => {
        if (!r.ok) return [];
        try {
          const d = await r.json();
          return Array.isArray(d) ? d : [];
        } catch {
          return [];
        }
      })
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    fetch("/api/freight")
      .then(async (r) => {
        if (!r.ok) return [];
        try {
          const d = await r.json();
          return Array.isArray(d) ? d : [];
        } catch {
          return [];
        }
      })
      .then(setFreightProfiles)
      .catch(() => setFreightProfiles([]));
  }, []);

  const quoteDefaultsUrl = useCallback(() => {
    const code = state.destinationCountryCode?.trim();
    if (code && code.length === 2) return `/api/saas/quote-defaults?country=${encodeURIComponent(code)}`;
    return "/api/saas/quote-defaults";
  }, [state.destinationCountryCode]);

  useEffect(() => {
    fetch(quoteDefaultsUrl())
      .then(async (r) => {
        if (!r.ok) return null;
        try {
          const d = await r.json();
          return d && typeof d.effectiveRateS80 === "number" ? d : null;
        } catch {
          return null;
        }
      })
      .then(setQuoteDefaults)
      .catch(() => setQuoteDefaults(null));
  }, [quoteDefaultsUrl]);

  useEffect(() => {
    fetch("/api/catalog?limit=200")
      .then(async (r) => {
        if (!r.ok) return [];
        try {
          const d = await r.json();
          return Array.isArray(d) ? d : [];
        } catch {
          return [];
        }
      })
      .then(setCatalogPieces)
      .catch(() => setCatalogPieces([]));
  }, []);

  useEffect(() => {
    if (state.costMethod !== "CSV" || !state.revitImportId) return;
    fetch(`/api/import/${state.revitImportId}`)
      .then(async (r) => {
        if (!r.ok) return null;
        try {
          return await r.json();
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (!data) return;
        let s80 = 0;
        let s150 = 0;
        let s200 = 0;
        for (const line of data.lines ?? []) {
          if (!line.isIgnored && line.m2Line) {
            const sys = line.catalogPiece?.systemCode ?? line.catalogPiece?.system_code;
            if (sys === "S80") s80 += line.m2Line;
            else if (sys === "S150") s150 += line.m2Line;
            else if (sys === "S200") s200 += line.m2Line;
          }
        }
        update({
          m2S80: +s80.toFixed(2),
          m2S150: +s150.toFixed(2),
          m2S200: +s200.toFixed(2),
        });
      })
      .catch(() => {});
  }, [state.revitImportId, state.costMethod, update]);

  useEffect(() => {
    if (step < 4 || !state.projectId || state.destinationCountryCode.trim().length !== 2) {
      setPreview((p) => ({ ...p, loading: false }));
      return;
    }

    const handle = window.setTimeout(() => {
      const seq = ++previewReq.current;
      setPreview((p) => ({ ...p, loading: true, error: null }));

      void (async () => {
        try {
          const res = await fetch("/api/saas/quotes/wizard-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: state.projectId,
              costMethod: state.costMethod,
              baseUom: state.baseUom,
              revitImportId: state.costMethod === "CSV" ? state.revitImportId : null,
              m2S80: state.m2S80,
              m2S150: state.m2S150,
              m2S200: state.m2S200,
              m2Total: 0,
              commissionPct: isSuperadmin ? state.commissionPct : 0,
              commissionFixed: state.commissionFixed,
              commissionFixedPerKit: state.commissionFixedPerKit,
              freightCostUsd: state.freightCostUsd,
              freightProfileId: state.freightProfileId.trim() || null,
              totalKits: state.totalKits,
              ...(!isSuperadmin ? { partnerMarkupPct: state.partnerMarkupPct } : {}),
              destinationCountryCode: state.destinationCountryCode.trim().toUpperCase(),
            }),
          });
          const data = (await res.json()) as Record<string, unknown>;
          if (seq !== previewReq.current) return;
          if (!res.ok) {
            const msg =
              typeof data?.message === "string"
                ? data.message
                : typeof data?.error === "string"
                  ? data.error
                  : t("wizard.previewLoadFailed");
            setPreview({ loading: false, error: msg, data: null });
            return;
          }
          setPreview({ loading: false, error: null, data });
        } catch {
          if (seq !== previewReq.current) return;
          setPreview({ loading: false, error: t("wizard.previewLoadFailed"), data: null });
        }
      })();
    }, 420);

    return () => window.clearTimeout(handle);
  }, [
    step,
    state.projectId,
    state.costMethod,
    state.baseUom,
    state.revitImportId,
    state.m2S80,
    state.m2S150,
    state.m2S200,
    state.commissionPct,
    state.commissionFixed,
    state.commissionFixedPerKit,
    state.freightCostUsd,
    state.freightProfileId,
    state.totalKits,
    state.partnerMarkupPct,
    state.destinationCountryCode,
    isSuperadmin,
    t,
  ]);

  const canAdvance = () => {
    if (step === 1) return !!state.projectId && !!state.costMethod;
    if (step === 2) {
      if (state.costMethod !== "CSV") return true;
      return !!state.revitImportId && state.unmatchedRows.filter((r) => !r.ignored && !r.mappedCatalogId).length === 0;
    }
    if (step === 4) return state.destinationCountryCode.trim().length === 2;
    return true;
  };

  const next = () => {
    if (!canAdvance()) return;
    if (step === 1 && state.costMethod !== "CSV") {
      setStep(3);
    } else {
      setStep((s) => Math.min(s + 1, 6));
    }
  };

  const prev = () => {
    if (step === 3 && state.costMethod !== "CSV") {
      setStep(1);
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  };

  const uploadCsv = async (file: File | null) => {
    if (!file || !state.projectId) {
      setError(t("wizard.selectProjectStep1"));
      return;
    }
    setCsvUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", state.projectId);
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? t("wizard.uploadFailed"));
        return;
      }
      update({
        revitImportId: data.revitImportId,
        csvValidRows: typeof data.validRows === "number" ? data.validRows : null,
        csvInvalidRows: typeof data.invalidRows === "number" ? data.invalidRows : null,
        csvParseErrors: Array.isArray(data.parseErrors) ? data.parseErrors : [],
        unmatchedRows: (data.unmatchedRows ?? []).map(
          (r: {
            lineId: string;
            rowIndex: number;
            revitFamily: string;
            revitType: string;
            quantity: number;
            area: number;
          }) => ({
            ...r,
            mappedCatalogId: null,
            ignored: false,
          })
        ),
      });
    } catch {
      setError(t("wizard.uploadFailed"));
    } finally {
      setCsvUploading(false);
    }
  };

  const mapRow = async (lineId: string, pieceId: string | null, ignore: boolean) => {
    if (!state.revitImportId) return;
    if (!ignore && (!pieceId || !String(pieceId).trim())) return;
    const res = await fetch(`/api/import/${state.revitImportId}/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, pieceId: pieceId ?? "", ignore }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? t("wizard.uploadFailed"));
      return;
    }
    if (ignore) {
      update({
        unmatchedRows: state.unmatchedRows.map((r) =>
          r.lineId === lineId ? { ...r, ignored: true, mappedCatalogId: null } : r
        ),
      });
    } else if (pieceId) {
      update({
        unmatchedRows: state.unmatchedRows.map((r) =>
          r.lineId === lineId ? { ...r, mappedCatalogId: pieceId, ignored: false } : r
        ),
      });
    }
    const imp = await fetch(`/api/import/${state.revitImportId}`).then((r) => r.json());
    let s80 = 0;
    let s150 = 0;
    let s200 = 0;
    for (const line of imp.lines ?? []) {
      if (!line.isIgnored && line.m2Line) {
        const sys = line.catalogPiece?.systemCode;
        if (sys === "S80") s80 += line.m2Line;
        else if (sys === "S150") s150 += line.m2Line;
        else if (sys === "S200") s200 += line.m2Line;
      }
    }
    update({
      m2S80: +s80.toFixed(2),
      m2S150: +s150.toFixed(2),
      m2S200: +s200.toFixed(2),
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/quotes/from-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: state.projectId,
          costMethod: state.costMethod,
          baseUom: state.baseUom,
          revitImportId: state.costMethod === "CSV" ? state.revitImportId : null,
          warehouseId: state.warehouseId || null,
          reserveStock: state.reserveStock,
          m2S80: state.m2S80,
          m2S150: state.m2S150,
          m2S200: state.m2S200,
          m2Total: 0,
          commissionPct: isSuperadmin ? state.commissionPct : 0,
          commissionFixed: state.commissionFixed,
          commissionFixedPerKit: state.commissionFixedPerKit,
          ...(!isSuperadmin ? { partnerMarkupPct: state.partnerMarkupPct } : {}),
          destinationCountryCode: state.destinationCountryCode.trim().toUpperCase(),
          freightCostUsd: state.freightCostUsd,
          freightProfileId: state.freightProfileId.trim() || null,
          totalKits: state.totalKits,
          countryId: null,
          taxRuleSetId: null,
          notes: state.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(saasApiUserFacingMessage(data, t, t("quotes.failedCreate")));
        return;
      }
      router.push(`/quotes/${data.id}`);
    } catch {
      setError(t("quotes.failedCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  const activeSteps = state.costMethod !== "CSV" ? STEPS.filter((s) => s.num !== 2) : STEPS;

  const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  const m2FactoryEst =
    state.m2S80 * (quoteDefaults?.effectiveRateS80 ?? 0) +
    state.m2S150 * (quoteDefaults?.effectiveRateS150 ?? 0) +
    state.m2S200 * (quoteDefaults?.effectiveRateS200 ?? 0);

  const partnerRatesLine =
    quoteDefaults != null
      ? t("quotes.wizardPartnerRatesLine", {
          r80: (Number(quoteDefaults.effectiveRateS80) || 0).toFixed(2),
          r150: (Number(quoteDefaults.effectiveRateS150) || 0).toFixed(2),
          r200: (Number(quoteDefaults.effectiveRateS200) || 0).toFixed(2),
        })
      : null;

  const snap = preview.data?.snapshot as Record<string, unknown> | undefined;
  const fcl = preview.data?.fcl as Record<string, unknown> | undefined;
  const pricing = preview.data?.pricing as Record<string, unknown> | undefined;

  return (
    <div className="data-entry-page max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/quotes"
          className="p-2 rounded-lg border border-border/60 hover:bg-muted/40"
          aria-label={t("quotes.backToQuotes")}
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("quotes.wizardTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("quotes.wizardSubtitle")}</p>
        </div>
      </div>

      <nav className="surface-card p-4" aria-label={t("quotes.wizardTitle")}>
        <div className="flex flex-wrap items-center gap-2" role="list">
          {activeSteps.map((s, i) => {
            const currentIdx = activeSteps.findIndex((as) => as.num === step);
            const isActive = s.num === step;
            const isDone = activeSteps.indexOf(s) < currentIdx;
            return (
              <div
                key={s.num}
                className="flex items-center gap-2 flex-1 min-w-[120px]"
                role="listitem"
                aria-current={isActive ? "step" : undefined}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium border ${
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {t(s.labelKey)}
                </span>
                {i < activeSteps.length - 1 && <div className="hidden sm:block flex-1 h-px bg-border mx-1" />}
              </div>
            );
          })}
        </div>
      </nav>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="surface-card p-6 space-y-6" aria-labelledby="wizard-active-step-title" aria-live="polite">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 id="wizard-active-step-title" className="text-lg font-semibold text-foreground">
                {t("wizard.step1Title")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{t("wizard.step1Desc")}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t("wizard.selectProject")}</label>
              <FilterSelect
                value={state.projectId}
                onValueChange={(v) => {
                  const p = projects.find((x) => x.id === v);
                  const cc =
                    p?.countryCode && String(p.countryCode).trim().length === 2
                      ? String(p.countryCode).trim().toUpperCase()
                      : "";
                  update({ projectId: v, ...(cc ? { destinationCountryCode: cc } : {}) });
                }}
                disabled={!!projectIdFromQuery}
                emptyOptionLabel={t("quotes.selectProjectPlaceholder")}
                options={projects.map((p) => ({
                  value: p.id,
                  label: p.projectName || p.projectCode || p.id.slice(0, 8),
                }))}
                aria-label={t("wizard.selectProject")}
                triggerClassName="h-10 w-full min-w-0 max-w-full text-sm"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("wizard.costingMethod")}</p>
              <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={t("wizard.costingMethod")}>
                {(
                  [
                    { value: "CSV" as const, label: t("wizard.csvRevitLabel"), desc: t("wizard.csvRevitDesc") },
                    { value: "M2_BY_SYSTEM" as const, label: t("wizard.m2BySystemLabel"), desc: t("wizard.m2BySystemDesc") },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={state.costMethod === opt.value}
                    onClick={() => update({ costMethod: opt.value })}
                    className={`rounded-lg border p-4 text-left transition-colors hover:border-primary/50 ${
                      state.costMethod === opt.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background"
                    }`}
                  >
                    <p className="font-medium text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("wizard.unitOfMeasure")}</p>
              <div className="flex gap-4">
                {(["M", "FT"] as const).map((u) => (
                  <label key={u} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={state.baseUom === u} onChange={() => update({ baseUom: u })} />
                    {u === "M" ? t("wizard.metersM") : t("wizard.feetFT")}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t("wizard.originWarehouse")}</label>
              <FilterSelect
                value={state.warehouseId}
                onValueChange={(v) => update({ warehouseId: v })}
                emptyOptionLabel={t("wizard.selectWarehouse")}
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                aria-label={t("wizard.originWarehouse")}
                triggerClassName="h-10 w-full min-w-0 max-w-full text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.reserveStock}
                onChange={(e) => update({ reserveStock: e.target.checked })}
              />
              {t("wizard.reserveStock")}
            </label>
            {partnerRatesLine && (
              <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-2 bg-muted/20">
                {partnerRatesLine}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 id="wizard-active-step-title" className="text-lg font-semibold text-foreground">
              {t("wizard.step2Title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("wizard.step2Desc")}</p>
            {state.csvValidRows != null && state.csvInvalidRows != null && (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">
                {t("wizard.csvRowsValidInvalid", {
                  valid: state.csvValidRows,
                  invalid: state.csvInvalidRows,
                })}
              </div>
            )}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={csvUploading}
              onChange={(e) => void uploadCsv(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {csvUploading && <p className="text-sm text-muted-foreground">{t("wizard.uploading")}</p>}
            {state.revitImportId && (
              <div className="border border-border/60 rounded-lg">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm font-medium flex justify-between items-center"
                  onClick={() => setImportLinesOpen((o) => !o)}
                  aria-expanded={importLinesOpen}
                >
                  {t("wizard.interpretedData")}
                  <span className="text-muted-foreground">{importLinesOpen ? "−" : "+"}</span>
                </button>
                {importLinesOpen && (
                  <div className="px-4 pb-4 max-h-64 overflow-auto text-xs text-muted-foreground border-t border-border/40">
                    <ImportLinesPeek importId={state.revitImportId} />
                  </div>
                )}
              </div>
            )}
            {state.unmatchedRows.length > 0 && (
              <div className="space-y-3 border border-border/60 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground">{t("wizard.unmatchedRows")}</p>
                <ul className="space-y-3">
                  {state.unmatchedRows.map((row) => (
                    <li
                      key={row.lineId}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center border-b border-border/40 pb-3 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground flex-1">
                        {row.revitType} {row.revitFamily ? `(${row.revitFamily})` : ""}
                      </span>
                      {!row.ignored && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <FilterSelect
                            value={row.mappedCatalogId ?? ""}
                            onValueChange={(v) => void mapRow(row.lineId, v || null, false)}
                            emptyOptionLabel={t("wizard.mapToCatalog")}
                            options={catalogPieces.map((p) => ({
                              value: p.id,
                              label: `${p.canonicalName} (${p.systemCode})`,
                            }))}
                            aria-label={t("wizard.mapToCatalog")}
                            triggerClassName="h-9 min-w-[200px] text-sm"
                          />
                          <button
                            type="button"
                            className="text-sm text-muted-foreground underline"
                            onClick={() => void mapRow(row.lineId, null, true)}
                          >
                            {t("wizard.ignore")}
                          </button>
                        </div>
                      )}
                      {row.ignored && <span className="text-xs text-muted-foreground">{t("wizard.ignored")}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 id="wizard-active-step-title" className="text-lg font-semibold text-foreground">
              {t("wizard.step3Title")}
            </h2>
            {state.costMethod === "CSV" ? (
              <p className="text-sm text-muted-foreground">{t("wizard.reviewCsvAreas")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("wizard.enterWallArea")}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.vbt80")}</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={state.m2S80}
                  onChange={(e) => update({ m2S80: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.vbt150")}</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={state.m2S150}
                  onChange={(e) => update({ m2S150: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.vbt200")}</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={state.m2S200}
                  onChange={(e) => update({ m2S200: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            {partnerRatesLine && (
              <p className="text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-2 bg-muted/20">
                {partnerRatesLine}
              </p>
            )}
            {quoteDefaults && (state.costMethod === "M2_BY_SYSTEM" || state.m2S80 + state.m2S150 + state.m2S200 > 0) && (
              <p className="text-sm text-muted-foreground">
                {t("wizard.estimatedFactoryExw")}: {fmt(m2FactoryEst)}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 id="wizard-active-step-title" className="text-lg font-semibold text-foreground">
              {t("wizard.step4Title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("wizard.step4Desc")}</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t("wizard.destinationCountry")}</label>
              <FilterSelect
                value={state.destinationCountryCode}
                onValueChange={(v) => update({ destinationCountryCode: v })}
                emptyOptionLabel={t("wizard.selectCountry")}
                options={countries.map((c) => ({
                  value: c.code,
                  label: `${c.name} (${c.code})`,
                }))}
                aria-label={t("wizard.destinationCountry")}
                triggerClassName="h-10 w-full min-w-0 max-w-full text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">{t("wizard.destinationCountryHint")}</p>
            </div>

            {isSuperadmin && (
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.commissionPct")}</label>
                <div className="mt-1 flex items-center gap-2 max-w-xs">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={state.commissionPct}
                    onChange={(e) => update({ commissionPct: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            )}
            {!isSuperadmin && (
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.partnerMarkup")}</label>
                <div className="mt-1 flex items-center gap-2 max-w-xs">
                  <input
                    type="number"
                    min={quoteDefaults?.partnerMarkupMinPct ?? 0}
                    max={quoteDefaults?.partnerMarkupMaxPct ?? undefined}
                    step={0.1}
                    value={state.partnerMarkupPct}
                    onChange={(e) => update({ partnerMarkupPct: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                {quoteDefaults != null &&
                  (quoteDefaults.partnerMarkupMinPct != null || quoteDefaults.partnerMarkupMaxPct != null) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("wizard.partnerMarkupBounds", {
                        min: quoteDefaults.partnerMarkupMinPct ?? "—",
                        max: quoteDefaults.partnerMarkupMaxPct ?? "—",
                      })}
                    </p>
                  )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.fixedPerOrder")}</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={state.commissionFixed}
                    onChange={(e) => update({ commissionFixed: parseFloat(e.target.value) || 0 })}
                    className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.fixedPerKit")}</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={state.commissionFixedPerKit}
                    onChange={(e) => update({ commissionFixedPerKit: parseFloat(e.target.value) || 0 })}
                    className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.totalKitsLabel")}</label>
              <input
                type="number"
                min={0}
                step={1}
                value={state.totalKits}
                onChange={(e) => update({ totalKits: parseInt(e.target.value, 10) || 0 })}
                className="mt-1 w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/15 p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">{t("wizard.previewSummary")}</p>
              {preview.loading && <p className="text-muted-foreground">{t("wizard.previewUpdating")}</p>}
              {preview.error && <p className="text-destructive text-sm">{preview.error}</p>}
              {!preview.loading && !preview.error && snap && fcl && (
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    {t("wizard.containersLabel")}: <span className="text-foreground font-medium">{String(snap.numContainers)}</span>{" "}
                    ({t("wizard.fclCapacityHint", { m3: String(fcl.containerCapacityM3 ?? quoteDefaults?.containerCapacityM3 ?? "—") })})
                  </li>
                  <li>
                    {t("wizard.kitsPerContainer")}:{" "}
                    <span className="text-foreground font-medium">{String(snap.kitsPerContainer)}</span>
                  </li>
                  <li>
                    {t("wizard.totalPanelVolume")}:{" "}
                    <span className="text-foreground font-medium">
                      {typeof snap.totalVolumeM3 === "number" ? snap.totalVolumeM3.toFixed(2) : "—"} m³
                    </span>
                  </li>
                  {pricing && typeof pricing.suggestedLandedUsd === "number" && (
                    <li className="pt-2 text-foreground font-semibold">
                      {t("wizard.estimatedLandedDdp")}: {fmt(pricing.suggestedLandedUsd as number)}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 id="wizard-active-step-title" className="text-lg font-semibold text-foreground">
              {t("wizard.step5Title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("wizard.step5Desc")}</p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t("wizard.destinationCountry")}</label>
              <FilterSelect
                value={state.destinationCountryCode}
                onValueChange={(v) => update({ destinationCountryCode: v })}
                emptyOptionLabel={t("wizard.selectCountry")}
                options={countries.map((c) => ({
                  value: c.code,
                  label: `${c.name} (${c.code})`,
                }))}
                aria-label={t("wizard.destinationCountry")}
                triggerClassName="h-10 w-full min-w-0 max-w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t("wizard.freightProfile")}</label>
              <FilterSelect
                value={state.freightProfileId}
                onValueChange={(v) => update({ freightProfileId: v })}
                emptyOptionLabel={t("wizard.manualEntry")}
                options={freightProfiles.map((fp) => ({
                  value: fp.id,
                  label: `${fp.name}${fp.country?.code ? ` (${fp.country.code})` : ""} — $${fp.freightPerContainer}${t("wizard.perContainerSuffix")}`,
                }))}
                aria-label={t("wizard.freightProfile")}
                triggerClassName="h-10 w-full min-w-0 max-w-full text-sm"
              />
            </div>
            {!state.freightProfileId.trim() && (
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">{t("wizard.totalFreightUsd")}</label>
                <div className="mt-1 flex items-center gap-2 max-w-xs">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={state.freightCostUsd}
                    onChange={(e) => update({ freightCostUsd: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
            {snap && (
              <p className="text-sm text-muted-foreground">
                {t("wizard.forContainers", { count: String(snap.numContainers ?? "—") })}:{" "}
                <span className="font-medium text-foreground">{fmt(Number(preview.data?.freightTotalUsd ?? 0))}</span>
              </p>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 id="wizard-active-step-title" className="text-lg font-semibold text-foreground">
              {t("wizard.step6Title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("wizard.step6Desc")}</p>
            {preview.loading && <p className="text-sm text-muted-foreground">{t("wizard.previewUpdating")}</p>}
            {preview.error && <p className="text-sm text-destructive">{preview.error}</p>}
            {snap && (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="p-2 font-medium">{t("wizard.financialSummary")}</th>
                      <th className="p-2 font-medium text-right">{t("wizard.wallAreaM2")}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <td className="p-2">VBT 80</td>
                      <td className="p-2 text-right">{Number(snap.wallAreaM2S80 ?? 0).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">VBT 150</td>
                      <td className="p-2 text-right">{Number(snap.wallAreaM2S150 ?? 0).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">VBT 200</td>
                      <td className="p-2 text-right">{Number(snap.wallAreaM2S200 ?? 0).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-border/40 font-medium text-foreground">
                      <td className="p-2">{t("wizard.wallArea")}</td>
                      <td className="p-2 text-right">{Number(snap.wallAreaM2Total ?? 0).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">{t("wizard.concreteRequired")}</td>
                      <td className="p-2 text-right">{Number(snap.concreteM3 ?? 0).toFixed(2)} m³</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">{t("wizard.steelEstimate")}</td>
                      <td className="p-2 text-right">{Number(snap.steelKgEst ?? 0).toFixed(0)} kg</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">{t("wizard.fillSteelPolicy")}</td>
                      <td className="p-2 text-right">{Number(snap.fillSteelKgEst ?? 0).toFixed(0)} kg</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">{t("quotes.freight")}</td>
                      <td className="p-2 text-right">{fmt(Number(preview.data?.freightTotalUsd ?? 0))}</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">{t("wizard.containersLabel")}</td>
                      <td className="p-2 text-right">{String(snap.numContainers)}</td>
                    </tr>
                    {pricing && typeof pricing.suggestedLandedUsd === "number" && (
                      <tr className="font-semibold text-foreground">
                        <td className="p-2">{t("wizard.landedDdpTotal")}</td>
                        <td className="p-2 text-right">{fmt(pricing.suggestedLandedUsd as number)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">{t("quotes.notes")}</label>
              <textarea
                rows={3}
                value={state.notes}
                onChange={(e) => update({ notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={prev}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>
        {step < 6 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {t("common.next")}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? t("quotes.creating") : t("quotes.createQuote")}
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ImportLinesPeek({ importId }: { importId: string }) {
  const [lines, setLines] = useState<Array<{ rowNum: number; rawPieceName: string; rawQty: number; catalogPieceId: string | null }>>(
    []
  );
  useEffect(() => {
    void fetch(`/api/import/${importId}`)
      .then((r) => r.json())
      .then((d) => setLines(Array.isArray(d?.lines) ? d.lines : []))
      .catch(() => setLines([]));
  }, [importId]);
  if (!lines.length) return <p className="py-2">…</p>;
  return (
    <table className="w-full mt-2">
      <tbody>
        {lines.slice(0, 80).map((l) => (
          <tr key={l.rowNum} className="border-b border-border/30">
            <td className="py-1 pr-2">{l.rowNum}</td>
            <td className="py-1">{l.rawPieceName}</td>
            <td className="py-1 text-right">{l.rawQty}</td>
            <td className="py-1 text-right">{l.catalogPieceId ? "✓" : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
