/**
 * Agrega importes de cotización (forma legacy de ventas) para una venta multi-proyecto.
 * `quantity` es el factor común aplicado a la suma (mismo criterio que NewSaleClient para una cotización).
 */
export type SaleQuoteFinancialRow = {
  factoryCostUsd: number;
  commissionPct: number;
  fobUsd: number;
  freightCostUsd: number;
  cifUsd: number;
  taxesFeesUsd: number;
  landedDdpUsd: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function aggregateSaleFinancialsFromQuoteRows(
  rows: SaleQuoteFinancialRow[],
  quantity: number
): {
  exwUsd: number;
  commissionPct: number;
  commissionAmountUsd: number;
  fobUsd: number;
  freightUsd: number;
  cifUsd: number;
  taxesFeesUsd: number;
  landedDdpUsd: number;
} {
  const mult = Math.max(1, quantity);
  let exw = 0;
  let commissionAmount = 0;
  let fob = 0;
  let freight = 0;
  let cif = 0;
  let taxes = 0;
  let ddp = 0;
  for (const r of rows) {
    exw += r.factoryCostUsd * mult;
    commissionAmount += (r.fobUsd - r.factoryCostUsd) * mult;
    fob += r.fobUsd * mult;
    freight += r.freightCostUsd * mult;
    cif += r.cifUsd * mult;
    taxes += r.taxesFeesUsd * mult;
    ddp += r.landedDdpUsd * mult;
  }
  const commissionPct = exw > 0 ? round2((commissionAmount / exw) * 100) : 0;
  return {
    exwUsd: round2(exw),
    commissionPct,
    commissionAmountUsd: round2(commissionAmount),
    fobUsd: round2(fob),
    freightUsd: round2(freight),
    cifUsd: round2(cif),
    taxesFeesUsd: round2(taxes),
    landedDdpUsd: round2(ddp),
  };
}
