export type QuoteCostMethod = "CSV" | "M2_BY_SYSTEM";

export interface QuoteWizardState {
  projectId: string;
  costMethod: QuoteCostMethod;
  baseUom: "M" | "FT";
  warehouseId: string;
  reserveStock: boolean;
  revitImportId: string;
  unmatchedRows: Array<{
    lineId: string;
    rowIndex: number;
    revitFamily: string;
    revitType: string;
    quantity: number;
    area: number;
    mappedCatalogId: string | null;
    ignored: boolean;
  }>;
  m2S80: number;
  m2S150: number;
  m2S200: number;
  commissionPct: number;
  commissionFixed: number;
  commissionFixedPerKit: number;
  kitsPerContainer: number;
  totalKits: number;
  numContainers: number;
  freightCostUsd: number;
  notes: string;
}

export const initialQuoteWizardState = (): QuoteWizardState => ({
  projectId: "",
  costMethod: "CSV",
  baseUom: "M",
  warehouseId: "",
  reserveStock: false,
  revitImportId: "",
  unmatchedRows: [],
  m2S80: 0,
  m2S150: 0,
  m2S200: 0,
  commissionPct: 0,
  commissionFixed: 0,
  commissionFixedPerKit: 0,
  kitsPerContainer: 0,
  totalKits: 0,
  numContainers: 1,
  freightCostUsd: 0,
  notes: "",
});
