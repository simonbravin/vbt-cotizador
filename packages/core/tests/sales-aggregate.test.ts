import { describe, it, expect } from "vitest";
import { aggregateSaleFinancialsFromQuoteRows } from "../src/sales-aggregate";

const rowA = {
  factoryCostUsd: 100,
  commissionPct: 10,
  fobUsd: 120,
  freightCostUsd: 10,
  cifUsd: 140,
  taxesFeesUsd: 5,
  landedDdpUsd: 150,
};

const rowB = {
  factoryCostUsd: 50,
  commissionPct: 8,
  fobUsd: 60,
  freightCostUsd: 5,
  cifUsd: 70,
  taxesFeesUsd: 2,
  landedDdpUsd: 80,
};

describe("aggregateSaleFinancialsFromQuoteRows", () => {
  it("sums two quotes with quantity 1", () => {
    const r = aggregateSaleFinancialsFromQuoteRows([rowA, rowB], 1);
    expect(r.exwUsd).toBe(150);
    expect(r.fobUsd).toBe(180);
    expect(r.freightUsd).toBe(15);
    expect(r.cifUsd).toBe(210);
    expect(r.taxesFeesUsd).toBe(7);
    expect(r.landedDdpUsd).toBe(230);
    expect(r.commissionAmountUsd).toBe(30);
    expect(r.commissionPct).toBe(20);
  });

  it("applies common quantity multiplier to the sum", () => {
    const r = aggregateSaleFinancialsFromQuoteRows([rowA, rowB], 2);
    expect(r.exwUsd).toBe(300);
    expect(r.landedDdpUsd).toBe(460);
    expect(r.commissionPct).toBe(20);
  });

  it("treats quantity below 1 as 1", () => {
    const r = aggregateSaleFinancialsFromQuoteRows([rowA], 0);
    expect(r.exwUsd).toBe(100);
  });
});
