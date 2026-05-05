import { describe, expect, it } from "vitest";
import { deriveFclContainersAndMetrics } from "../src/calculations";

describe("deriveFclContainersAndMetrics", () => {
  it("uses ceil(volume/capacity) with kits and volume", () => {
    const r = deriveFclContainersAndMetrics({
      totalKits: 10,
      totalVolumeM3: 70,
      containerCapacityM3: 68,
    });
    expect(r.numContainers).toBe(2);
    expect(r.kitsPerContainer).toBe(5);
  });

  it("uses at least one container when kits exist but volume is zero", () => {
    const r = deriveFclContainersAndMetrics({
      totalKits: 3,
      totalVolumeM3: 0,
      containerCapacityM3: 68,
    });
    expect(r.numContainers).toBe(1);
    expect(r.kitsPerContainer).toBe(3);
  });

  it("defaults to one container when no kits", () => {
    const r = deriveFclContainersAndMetrics({
      totalKits: 0,
      totalVolumeM3: 100,
      containerCapacityM3: 68,
    });
    expect(r.numContainers).toBe(1);
    expect(r.kitsPerContainer).toBe(0);
  });
});
