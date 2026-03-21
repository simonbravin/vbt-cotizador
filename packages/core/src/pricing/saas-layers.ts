/**
 * SaaS quote header stack: EXW factory → Vision Latam % → partner % → logistics/import → CIF, then optional tax rules.
 * Matches `enrichQuoteForSales` in `apps/web` (logistics + local + import on CIF; technical service separate).
 * Uses `computeCif` and `computeTaxLines` / `sumTaxLines` from `calculations.ts` — no duplicated formulas beyond explicit VL/partner multipliers.
 */

import type { TaxRule, TaxLineResult } from "../calculations";
import { computeCif, computeTaxLines, sumTaxLines } from "../calculations";

export type SaaSQuotePricingInput = {
  /** Raw EXW / factory total (what superadmin stores as `factoryCostTotal`). */
  factoryExwUsd: number;
  visionLatamMarkupPct: number;
  partnerMarkupPct: number;
  logisticsCostUsd: number;
  localTransportCostUsd: number;
  importCostUsd: number;
  technicalServiceUsd: number;
  taxRules?: TaxRule[];
  numContainers?: number;
};

export type SaaSQuotePricingResult = {
  factoryExwUsd: number;
  visionLatamMarkupPct: number;
  partnerMarkupPct: number;
  /** EXW × (1 + VL%). */
  afterVisionLatamUsd: number;
  /** Amount partners treat as “factory” (VL-inclusive); same as list `basePriceForPartner`. */
  basePriceForPartnerUsd: number;
  /** after VL × (1 + partner%). */
  afterPartnerMarkupUsd: number;
  freightUsd: number;
  importCostUsd: number;
  /** `afterPartner + freight` via `computeCif`, then + import (SaaS list semantics). */
  cifUsd: number;
  technicalServiceUsd: number;
  taxLines: TaxLineResult[];
  /** Sum of rule-based tax lines only (not technical service). */
  ruleTaxesUsd: number;
  /**
   * Suggested DDP-style total: CIF + rule taxes + technical service.
   * Legacy list used `taxesFeesUsd = technicalService` only; this is the fuller stack for consistency checks.
   */
  suggestedLandedUsd: number;
};

export function priceSaaSQuoteLayers(input: SaaSQuotePricingInput): SaaSQuotePricingResult {
  const factory = Math.max(0, Number(input.factoryExwUsd) || 0);
  const vl = Number(input.visionLatamMarkupPct) || 0;
  const pm = Number(input.partnerMarkupPct) || 0;
  const logistics = Math.max(0, Number(input.logisticsCostUsd) || 0);
  const localT = Math.max(0, Number(input.localTransportCostUsd) || 0);
  const importC = Math.max(0, Number(input.importCostUsd) || 0);
  const tech = Math.max(0, Number(input.technicalServiceUsd) || 0);
  const freightUsd = logistics + localT;

  const afterVisionLatamUsd = factory * (1 + vl / 100);
  const basePriceForPartnerUsd = afterVisionLatamUsd;
  const afterPartnerMarkupUsd = afterVisionLatamUsd * (1 + pm / 100);
  const cifBase = computeCif(afterPartnerMarkupUsd, freightUsd);
  const cifUsd = cifBase + importC;
  const numContainers = input.numContainers ?? 1;
  const taxRules = input.taxRules ?? [];
  const taxLines = computeTaxLines({
    cifUsd,
    fobUsd: afterPartnerMarkupUsd,
    numContainers,
    rules: taxRules,
  });
  const ruleTaxesUsd = sumTaxLines(taxLines);
  const suggestedLandedUsd = cifUsd + ruleTaxesUsd + tech;

  return {
    factoryExwUsd: factory,
    visionLatamMarkupPct: vl,
    partnerMarkupPct: pm,
    afterVisionLatamUsd,
    basePriceForPartnerUsd,
    afterPartnerMarkupUsd,
    freightUsd,
    importCostUsd: importC,
    cifUsd,
    technicalServiceUsd: tech,
    taxLines,
    ruleTaxesUsd,
    suggestedLandedUsd,
  };
}
