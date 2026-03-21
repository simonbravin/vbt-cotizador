import { describe, expect, it } from "vitest";
import {
  canonicalizeSaaSQuotePayload,
  normalizeSaaSQuoteItemLine,
  priceSaaSQuoteLayers,
} from "../src/pricing";

describe("priceSaaSQuoteLayers", () => {
  it("applies VL then partner on EXW", () => {
    const r = priceSaaSQuoteLayers({
      factoryExwUsd: 1000,
      visionLatamMarkupPct: 20,
      partnerMarkupPct: 10,
      logisticsCostUsd: 50,
      localTransportCostUsd: 25,
      importCostUsd: 100,
      technicalServiceUsd: 30,
      taxRules: [],
    });
    expect(r.afterVisionLatamUsd).toBe(1200);
    expect(r.basePriceForPartnerUsd).toBe(1200);
    expect(r.afterPartnerMarkupUsd).toBe(1320);
    expect(r.freightUsd).toBe(75);
    expect(r.cifUsd).toBe(1320 + 75 + 100);
    expect(r.suggestedLandedUsd).toBe(r.cifUsd + r.ruleTaxesUsd + 30);
  });
});

describe("normalizeSaaSQuoteItemLine", () => {
  it("ignores client totalPrice and derives EXW line total", () => {
    const n = normalizeSaaSQuoteItemLine(
      {
        itemType: "product",
        quantity: 2,
        unitCost: 100,
        markupPct: 10,
        totalPrice: 9999,
      },
      0
    );
    expect(n.totalPrice).toBe(2 * 100 * 1.1);
    expect(n.unitPrice).toBe((2 * 100 * 1.1) / 2);
  });
});

describe("canonicalizeSaaSQuotePayload", () => {
  it("uses sum of lines as EXW when items exist", () => {
    const c = canonicalizeSaaSQuotePayload({
      items: [
        { itemType: "product", quantity: 1, unitCost: 100, markupPct: 0 },
        { itemType: "service", quantity: 1, unitCost: 50, markupPct: 0 },
      ],
      headerFactoryExwUsd: 9999,
      visionLatamMarkupPct: 0,
      partnerMarkupPct: 0,
      logisticsCostUsd: 0,
      localTransportCostUsd: 0,
      importCostUsd: 0,
      technicalServiceUsd: 0,
      taxRules: [],
    });
    expect(c.factoryCostTotal).toBe(150);
    expect(c.totalPrice).toBe(c.layers.suggestedLandedUsd);
  });

  it("uses header EXW when there are no lines", () => {
    const c = canonicalizeSaaSQuotePayload({
      items: [],
      headerFactoryExwUsd: 500,
      visionLatamMarkupPct: 0,
      partnerMarkupPct: 0,
      logisticsCostUsd: 0,
      localTransportCostUsd: 0,
      importCostUsd: 0,
      technicalServiceUsd: 0,
      taxRules: [],
    });
    expect(c.factoryCostTotal).toBe(500);
  });
});
