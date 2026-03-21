import { describe, expect, it } from "vitest";
import {
  clampPartnerMarkupPct,
  parsePartnerQuoteDefaultsJson,
  resolveSaaSQuotePricingForCreate,
} from "../src/pricing/partner-pricing-resolution";

describe("clampPartnerMarkupPct", () => {
  it("clamps to min and max", () => {
    expect(clampPartnerMarkupPct(50, 10, 40)).toBe(40);
    expect(clampPartnerMarkupPct(5, 10, 40)).toBe(10);
    expect(clampPartnerMarkupPct(25, 10, 40)).toBe(25);
  });

  it("ignores null bounds", () => {
    expect(clampPartnerMarkupPct(99, null, null)).toBe(99);
  });
});

describe("parsePartnerQuoteDefaultsJson", () => {
  it("parses country overrides with uppercase keys", () => {
    const p = parsePartnerQuoteDefaultsJson({
      defaultPartnerMarkupPct: 12,
      countryOverrides: { ar: { defaultPartnerMarkupPct: 15 } },
    });
    expect(p.defaultPartnerMarkupPct).toBe(12);
    expect(p.countryOverrides?.AR?.defaultPartnerMarkupPct).toBe(15);
  });
});

describe("resolveSaaSQuotePricingForCreate", () => {
  const resolved = {
    organizationId: "org1",
    projectCountryCode: "AR",
    effectiveVisionLatamMarkupPct: 20,
    defaultPartnerMarkupPct: 8,
    defaultLogisticsCostUsd: 10,
    defaultImportCostUsd: 5,
    defaultLocalTransportCostUsd: 2,
    defaultTechnicalServiceCostUsd: 1,
    allowedPartnerMarkupMinPct: 5,
    allowedPartnerMarkupMaxPct: 30,
  };

  it("uses partner defaults when explicit omitted", () => {
    const r = resolveSaaSQuotePricingForCreate({
      isSuperadmin: false,
      explicit: {},
      resolved,
    });
    expect(r.visionLatamMarkupPct).toBe(20);
    expect(r.partnerMarkupPct).toBe(8);
    expect(r.logisticsCostUsd).toBe(10);
  });

  it("allows superadmin to set VL explicitly", () => {
    const r = resolveSaaSQuotePricingForCreate({
      isSuperadmin: true,
      explicit: { visionLatamMarkupPct: 25 },
      resolved,
    });
    expect(r.visionLatamMarkupPct).toBe(25);
  });

  it("clamps explicit partner markup", () => {
    const r = resolveSaaSQuotePricingForCreate({
      isSuperadmin: false,
      explicit: { partnerMarkupPct: 100 },
      resolved,
    });
    expect(r.partnerMarkupPct).toBe(30);
  });
});
