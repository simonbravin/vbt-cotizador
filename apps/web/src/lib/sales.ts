/** Sale amounts by basis (Incoterm). */
export type InvoicedBasis = "EXW" | "FOB" | "CIF" | "DDP";

export const INVOICED_BASIS_OPTIONS: InvoicedBasis[] = ["EXW", "FOB", "CIF", "DDP"];

export function getInvoicedAmount(sale: {
  invoicedBasis?: string | null;
  exwUsd: number;
  fobUsd: number;
  cifUsd: number;
  landedDdpUsd: number;
}): number {
  const b = (sale.invoicedBasis || "DDP").toUpperCase();
  if (b === "EXW") return sale.exwUsd;
  if (b === "FOB") return sale.fobUsd;
  if (b === "CIF") return sale.cifUsd;
  return sale.landedDdpUsd;
}
