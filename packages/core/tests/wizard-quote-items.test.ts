import { describe, expect, it } from "vitest";
import { wizardSnapshotLinesToItems } from "../src/services/wizard-quote-compute";

describe("wizardSnapshotLinesToItems", () => {
  it("uses lineTotalWithMarkup so SaaS items match CSV snapshot factory", () => {
    const items = wizardSnapshotLinesToItems([
      {
        description: "Panel",
        pieceId: "p1",
        qty: 10,
        lineTotal: 100,
        lineTotalWithMarkup: 120,
        isIgnored: false,
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.totalPrice).toBe(120);
    expect(items[0]?.unitCost).toBe(12);
  });
});
