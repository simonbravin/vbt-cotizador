/**
 * Single authoritative path for SaaS quote money fields persisted to Prisma.
 * QuoteItems (when present) are the EXW basis; header factory is used only for header-only quotes.
 */

import type { TaxRule } from "../calculations";
import type { CreateQuoteItemInput, QuoteItemType } from "../services/quotes";
import { priceSaaSQuoteLayers, type SaaSQuotePricingResult } from "./saas-layers";

export type CanonicalSaaSQuoteSource = {
  items?: CreateQuoteItemInput[] | null;
  /**
   * When there are zero line items, EXW comes from here.
   * Ignored when `items.length > 0` (lines are authoritative).
   */
  headerFactoryExwUsd?: number | null;
  visionLatamMarkupPct: number;
  partnerMarkupPct: number;
  logisticsCostUsd: number;
  localTransportCostUsd: number;
  importCostUsd: number;
  technicalServiceUsd: number;
  /** Resolved from `TaxRuleSet` for the quote org + project country; required for landed total. */
  taxRules: TaxRule[];
};

/** Output of `mergeSaaSQuotePatchIntoSource` — caller must attach `taxRules` before `canonicalizeSaaSQuotePayload`. */
export type MergedSaaSQuotePatchSource = Omit<CanonicalSaaSQuoteSource, "taxRules">;

export type CanonicalSaaSQuotePersist = {
  items: CreateQuoteItemInput[];
  factoryCostTotal: number;
  totalPrice: number;
  visionLatamMarkupPct: number;
  partnerMarkupPct: number;
  logisticsCostUsd: number;
  localTransportCostUsd: number;
  importCostUsd: number;
  technicalServiceUsd: number;
  layers: SaaSQuotePricingResult;
};

/** Normalize one line: EXW line total = qty × unitCost × (1 + markup%). Client-sent totalPrice is ignored. */
export function normalizeSaaSQuoteItemLine(item: CreateQuoteItemInput, sortIndex: number): CreateQuoteItemInput {
  const q = Math.max(0, Number(item.quantity ?? 0));
  const uc = Math.max(0, Number(item.unitCost ?? 0));
  const m = Number(item.markupPct ?? 0);
  const lineExw = q * uc * (1 + m / 100);
  return {
    ...item,
    itemType: item.itemType,
    quantity: q,
    unitCost: uc,
    markupPct: m,
    totalPrice: lineExw,
    unitPrice: q > 0 ? lineExw / q : 0,
    sortOrder: item.sortOrder ?? sortIndex,
    sku: item.sku ?? null,
    description: item.description ?? null,
    unit: item.unit ?? null,
    catalogPieceId: item.catalogPieceId ?? null,
  };
}

export function prismaQuoteItemsToInputs(
  rows: Array<{
    itemType: string;
    sku?: string | null;
    description?: string | null;
    unit?: string | null;
    quantity: number;
    unitCost: number;
    markupPct: number;
    unitPrice: number;
    totalPrice: number;
    sortOrder: number;
    catalogPieceId?: string | null;
  }>
): CreateQuoteItemInput[] {
  return rows.map((it, i) =>
    normalizeSaaSQuoteItemLine(
      {
        itemType: it.itemType as QuoteItemType,
        sku: it.sku ?? null,
        description: it.description ?? null,
        unit: it.unit ?? null,
        quantity: it.quantity,
        unitCost: it.unitCost,
        markupPct: it.markupPct,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        sortOrder: it.sortOrder ?? i,
        catalogPieceId: it.catalogPieceId ?? null,
      },
      i
    )
  );
}

function num(patch: number | undefined, fallback: number): number {
  return patch !== undefined ? patch : fallback;
}

/**
 * Merge DB quote + PATCH into one canonical source (before normalization).
 */
export function mergeSaaSQuotePatchIntoSource(
  existing: Record<string, unknown> & {
    items?: Array<{
      itemType: string;
      sku?: string | null;
      description?: string | null;
      unit?: string | null;
      quantity: number;
      unitCost: number;
      markupPct: number;
      unitPrice: number;
      totalPrice: number;
      sortOrder: number;
      catalogPieceId?: string | null;
    }>;
  },
  patch: {
    items?: CreateQuoteItemInput[];
    factoryCostTotal?: number;
    visionLatamMarkupPct?: number;
    partnerMarkupPct?: number;
    logisticsCost?: number;
    importCost?: number;
    localTransportCost?: number;
    technicalServiceCost?: number;
  },
  isSuperadmin: boolean
): MergedSaaSQuotePatchSource {
  const fromDb = prismaQuoteItemsToInputs(existing.items ?? []);
  const rawItems = patch.items !== undefined ? patch.items : fromDb.map((it, i) => ({ ...it, sortOrder: it.sortOrder ?? i }));

  const exFac = Number(existing.factoryCostTotal ?? 0);
  const headerFromPatch = isSuperadmin && patch.factoryCostTotal !== undefined ? patch.factoryCostTotal : undefined;
  const headerFactoryExwUsd =
    rawItems.length > 0 ? undefined : headerFromPatch !== undefined ? headerFromPatch : exFac;

  return {
    items: rawItems,
    headerFactoryExwUsd,
    visionLatamMarkupPct: num(patch.visionLatamMarkupPct, Number(existing.visionLatamMarkupPct ?? 0)),
    partnerMarkupPct: num(patch.partnerMarkupPct, Number(existing.partnerMarkupPct ?? 0)),
    logisticsCostUsd: num(patch.logisticsCost, Number(existing.logisticsCost ?? 0)),
    localTransportCostUsd: num(patch.localTransportCost, Number(existing.localTransportCost ?? 0)),
    importCostUsd: num(patch.importCost, Number(existing.importCost ?? 0)),
    technicalServiceUsd: num(patch.technicalServiceCost, Number(existing.technicalServiceCost ?? 0)),
  } satisfies MergedSaaSQuotePatchSource;
}

/**
 * Authoritative SaaS persist shape: normalized lines, factory EXW, landed total from `priceSaaSQuoteLayers` only.
 */
export function canonicalizeSaaSQuotePayload(src: CanonicalSaaSQuoteSource): CanonicalSaaSQuotePersist {
  const normalizedItems = (src.items ?? []).map((it, i) => normalizeSaaSQuoteItemLine(it, i));
  const hasLines = normalizedItems.length > 0;
  const factoryExw = hasLines
    ? normalizedItems.reduce((s, it) => s + Number(it.totalPrice ?? 0), 0)
    : Math.max(0, Number(src.headerFactoryExwUsd ?? 0));

  const layers = priceSaaSQuoteLayers({
    factoryExwUsd: factoryExw,
    visionLatamMarkupPct: src.visionLatamMarkupPct,
    partnerMarkupPct: src.partnerMarkupPct,
    logisticsCostUsd: src.logisticsCostUsd,
    localTransportCostUsd: src.localTransportCostUsd,
    importCostUsd: src.importCostUsd,
    technicalServiceUsd: src.technicalServiceUsd,
    taxRules: src.taxRules,
  });

  return {
    items: normalizedItems,
    factoryCostTotal: factoryExw,
    totalPrice: layers.suggestedLandedUsd,
    visionLatamMarkupPct: src.visionLatamMarkupPct,
    partnerMarkupPct: src.partnerMarkupPct,
    logisticsCostUsd: src.logisticsCostUsd,
    localTransportCostUsd: src.localTransportCostUsd,
    importCostUsd: src.importCostUsd,
    technicalServiceUsd: src.technicalServiceUsd,
    layers,
  };
}

export function patchRequiresSaaSQuotePricingRecompute(
  patch: {
    items?: unknown;
    factoryCostTotal?: unknown;
    visionLatamMarkupPct?: unknown;
    partnerMarkupPct?: unknown;
    logisticsCost?: unknown;
    importCost?: unknown;
    localTransportCost?: unknown;
    technicalServiceCost?: unknown;
  },
  isSuperadmin: boolean
): boolean {
  if (patch.items !== undefined) return true;
  if (patch.partnerMarkupPct !== undefined) return true;
  if (patch.logisticsCost !== undefined) return true;
  if (patch.importCost !== undefined) return true;
  if (patch.localTransportCost !== undefined) return true;
  if (patch.technicalServiceCost !== undefined) return true;
  if (isSuperadmin && patch.factoryCostTotal !== undefined) return true;
  if (isSuperadmin && patch.visionLatamMarkupPct !== undefined) return true;
  return false;
}
