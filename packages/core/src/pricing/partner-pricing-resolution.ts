/**
 * Canonical partner commercial configuration for SaaS quote pricing.
 * Raw math stays in `calculations.ts` / `saas-layers.ts`; this module resolves **inputs** to those functions.
 */

import type { PrismaClient } from "@vbt/db";
import { getPlatformPricingFallback, getVisionLatamCommissionPctForOrg } from "../services/platform-config";
import type { MergedSaaSQuotePatchSource } from "./saas-quote-persist";

/** Stored in `partner_profiles.quote_defaults` JSON (merged with legacy wizard keys). */
export type CountryQuotePricingOverride = {
  visionLatamMarkupPct?: number;
  defaultPartnerMarkupPct?: number;
  defaultLogisticsCostUsd?: number;
  defaultImportCostUsd?: number;
  defaultLocalTransportCostUsd?: number;
  defaultTechnicalServiceCostUsd?: number;
};

export type PartnerQuoteDefaultsJson = {
  baseUom?: "M" | "FT";
  weightUom?: "KG" | "LBS";
  minRunFt?: number;
  commissionPct?: number;
  commissionFixed?: number;
  /** Default SaaS partner markup % for new quotes (before min/max clamp). */
  defaultPartnerMarkupPct?: number;
  defaultLogisticsCostUsd?: number;
  defaultImportCostUsd?: number;
  defaultLocalTransportCostUsd?: number;
  defaultTechnicalServiceCostUsd?: number;
  /** ISO 3166-1 alpha-2 keys (uppercase recommended). */
  countryOverrides?: Record<string, CountryQuotePricingOverride>;
};

/** Effective partner policy passed into pricing orchestration (SaaS create / guards on PATCH). */
export type ResolvedPartnerPricingConfig = {
  organizationId: string;
  projectCountryCode: string | null;
  effectiveVisionLatamMarkupPct: number;
  defaultPartnerMarkupPct: number;
  defaultLogisticsCostUsd: number;
  defaultImportCostUsd: number;
  defaultLocalTransportCostUsd: number;
  defaultTechnicalServiceCostUsd: number;
  allowedPartnerMarkupMinPct: number | null;
  allowedPartnerMarkupMaxPct: number | null;
};

function numOrUndef(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeCountryCode(cc: string | null | undefined): string | null {
  if (cc == null || typeof cc !== "string") return null;
  const t = cc.trim().toUpperCase();
  return t.length === 2 ? t : t || null;
}

function pickCountryOverride(
  map: Record<string, CountryQuotePricingOverride> | undefined,
  countryCode: string | null
): CountryQuotePricingOverride | undefined {
  if (!countryCode || !map) return undefined;
  return map[countryCode] ?? map[countryCode.toLowerCase()];
}

export function parsePartnerQuoteDefaultsJson(raw: unknown): PartnerQuoteDefaultsJson {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const bu = o.baseUom;
  const wu = o.weightUom;
  let countryOverrides: Record<string, CountryQuotePricingOverride> | undefined;
  if (o.countryOverrides && typeof o.countryOverrides === "object" && o.countryOverrides !== null) {
    countryOverrides = {};
    for (const [k, v] of Object.entries(o.countryOverrides as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const c = v as Record<string, unknown>;
      countryOverrides[k.trim().toUpperCase()] = {
        visionLatamMarkupPct: numOrUndef(c.visionLatamMarkupPct),
        defaultPartnerMarkupPct: numOrUndef(c.defaultPartnerMarkupPct),
        defaultLogisticsCostUsd: numOrUndef(c.defaultLogisticsCostUsd),
        defaultImportCostUsd: numOrUndef(c.defaultImportCostUsd),
        defaultLocalTransportCostUsd: numOrUndef(c.defaultLocalTransportCostUsd),
        defaultTechnicalServiceCostUsd: numOrUndef(c.defaultTechnicalServiceCostUsd),
      };
    }
  }
  return {
    baseUom: bu === "FT" || bu === "M" ? bu : undefined,
    weightUom: wu === "KG" || wu === "LBS" ? wu : undefined,
    minRunFt: numOrUndef(o.minRunFt),
    commissionPct: numOrUndef(o.commissionPct),
    commissionFixed: numOrUndef(o.commissionFixed),
    defaultPartnerMarkupPct: numOrUndef(o.defaultPartnerMarkupPct),
    defaultLogisticsCostUsd: numOrUndef(o.defaultLogisticsCostUsd),
    defaultImportCostUsd: numOrUndef(o.defaultImportCostUsd),
    defaultLocalTransportCostUsd: numOrUndef(o.defaultLocalTransportCostUsd),
    defaultTechnicalServiceCostUsd: numOrUndef(o.defaultTechnicalServiceCostUsd),
    countryOverrides,
  };
}

export function clampPartnerMarkupPct(
  value: number,
  minPct: number | null | undefined,
  maxPct: number | null | undefined
): number {
  let x = Number(value);
  if (!Number.isFinite(x)) x = 0;
  if (minPct != null && Number.isFinite(minPct)) x = Math.max(x, minPct);
  if (maxPct != null && Number.isFinite(maxPct)) x = Math.min(x, maxPct);
  return x;
}

/**
 * Load effective commercial configuration for an organization, optionally scoped by project country.
 */
export async function resolvePartnerPricingConfig(
  prisma: PrismaClient,
  args: { organizationId: string; projectCountryCode?: string | null }
): Promise<ResolvedPartnerPricingConfig> {
  const { organizationId } = args;
  const projectCountryCode = normalizeCountryCode(args.projectCountryCode ?? null);

  const [profile, platform] = await Promise.all([
    prisma.partnerProfile.findUnique({
      where: { organizationId },
      select: {
        marginMinPct: true,
        marginMaxPct: true,
        quoteDefaults: true,
      },
    }),
    getPlatformPricingFallback(prisma),
  ]);

  const qd = parsePartnerQuoteDefaultsJson(profile?.quoteDefaults ?? undefined);
  const co = pickCountryOverride(qd.countryOverrides, projectCountryCode);

  const baseVl = await getVisionLatamCommissionPctForOrg(prisma, organizationId);
  const effectiveVisionLatamMarkupPct =
    co?.visionLatamMarkupPct != null && Number.isFinite(co.visionLatamMarkupPct)
      ? co.visionLatamMarkupPct
      : baseVl;

  const defaultPartnerMarkupPct =
    co?.defaultPartnerMarkupPct != null && Number.isFinite(co.defaultPartnerMarkupPct)
      ? co.defaultPartnerMarkupPct
      : qd.defaultPartnerMarkupPct ?? 0;

  const defaultLogisticsCostUsd =
    co?.defaultLogisticsCostUsd != null && Number.isFinite(co.defaultLogisticsCostUsd)
      ? Math.max(0, co.defaultLogisticsCostUsd)
      : Math.max(0, qd.defaultLogisticsCostUsd ?? 0);

  const defaultImportCostUsd =
    co?.defaultImportCostUsd != null && Number.isFinite(co.defaultImportCostUsd)
      ? Math.max(0, co.defaultImportCostUsd)
      : Math.max(0, qd.defaultImportCostUsd ?? 0);

  const defaultLocalTransportCostUsd =
    co?.defaultLocalTransportCostUsd != null && Number.isFinite(co.defaultLocalTransportCostUsd)
      ? Math.max(0, co.defaultLocalTransportCostUsd)
      : Math.max(0, qd.defaultLocalTransportCostUsd ?? 0);

  const defaultTechnicalServiceCostUsd =
    co?.defaultTechnicalServiceCostUsd != null && Number.isFinite(co.defaultTechnicalServiceCostUsd)
      ? Math.max(0, co.defaultTechnicalServiceCostUsd)
      : Math.max(0, qd.defaultTechnicalServiceCostUsd ?? 0);

  const allowedPartnerMarkupMinPct =
    profile?.marginMinPct != null && Number.isFinite(profile.marginMinPct)
      ? profile.marginMinPct
      : platform.defaultMarginMinPct;

  const allowedPartnerMarkupMaxPct =
    profile?.marginMaxPct != null && Number.isFinite(profile.marginMaxPct)
      ? profile.marginMaxPct
      : platform.defaultMarginMaxPct;

  return {
    organizationId,
    projectCountryCode,
    effectiveVisionLatamMarkupPct,
    defaultPartnerMarkupPct,
    defaultLogisticsCostUsd,
    defaultImportCostUsd,
    defaultLocalTransportCostUsd,
    defaultTechnicalServiceCostUsd,
    allowedPartnerMarkupMinPct,
    allowedPartnerMarkupMaxPct,
  };
}

export type ExplicitSaaSQuotePricingFields = {
  visionLatamMarkupPct?: number;
  partnerMarkupPct?: number;
  logisticsCost?: number;
  importCost?: number;
  localTransportCost?: number;
  technicalServiceCost?: number;
};

/**
 * Precedence for **new** quotes (POST):
 * 1) Platform default (VL commission fallback, margin min/max fallback)
 * 2) Partner profile + `quote_defaults` (+ optional country override)
 * 3) Explicit request fields where the role may set them; then partner markup is clamped to policy.
 *
 * `visionLatamMarkupPct`: only superadmin may set explicitly; otherwise effective partner+platform (+ country) VL.
 * Fees: explicit value if present, else partner defaults.
 */
export function resolveSaaSQuotePricingForCreate(args: {
  isSuperadmin: boolean;
  explicit: ExplicitSaaSQuotePricingFields;
  resolved: ResolvedPartnerPricingConfig;
}): {
  visionLatamMarkupPct: number;
  partnerMarkupPct: number;
  logisticsCostUsd: number;
  importCostUsd: number;
  localTransportCostUsd: number;
  technicalServiceUsd: number;
} {
  const { isSuperadmin, explicit, resolved } = args;
  const visionLatamMarkupPct =
    isSuperadmin && explicit.visionLatamMarkupPct !== undefined
      ? Number(explicit.visionLatamMarkupPct)
      : resolved.effectiveVisionLatamMarkupPct;

  const rawPartner =
    explicit.partnerMarkupPct !== undefined
      ? Number(explicit.partnerMarkupPct)
      : resolved.defaultPartnerMarkupPct;

  const partnerMarkupPct = clampPartnerMarkupPct(
    rawPartner,
    resolved.allowedPartnerMarkupMinPct,
    resolved.allowedPartnerMarkupMaxPct
  );

  return {
    visionLatamMarkupPct,
    partnerMarkupPct,
    logisticsCostUsd:
      explicit.logisticsCost !== undefined ? Number(explicit.logisticsCost) : resolved.defaultLogisticsCostUsd,
    importCostUsd: explicit.importCost !== undefined ? Number(explicit.importCost) : resolved.defaultImportCostUsd,
    localTransportCostUsd:
      explicit.localTransportCost !== undefined
        ? Number(explicit.localTransportCost)
        : resolved.defaultLocalTransportCostUsd,
    technicalServiceUsd:
      explicit.technicalServiceCost !== undefined
        ? Number(explicit.technicalServiceCost)
        : resolved.defaultTechnicalServiceCostUsd,
  };
}

/**
 * On PATCH pricing recompute: clamp partner markup to current policy. VL follows merge (DB / superadmin patch).
 */
export function clampPartnerMarkupOnMergedSaaSSource(
  merged: MergedSaaSQuotePatchSource,
  resolved: ResolvedPartnerPricingConfig
): MergedSaaSQuotePatchSource {
  return {
    ...merged,
    partnerMarkupPct: clampPartnerMarkupPct(
      merged.partnerMarkupPct,
      resolved.allowedPartnerMarkupMinPct,
      resolved.allowedPartnerMarkupMaxPct
    ),
  };
}
