import { describe, expect, it } from "vitest";
import { deriveFclContainersAndMetrics, deriveFclContainersFromWallM2 } from "../src/calculations";

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

describe("deriveFclContainersFromWallM2", () => {
  it("uses max ceil(m2/area) across systems with kits", () => {
    const r = deriveFclContainersFromWallM2({
      m2S80: 0,
      m2S150: 1260,
      m2S200: 0,
      areaM2PerContainerS80: 320,
      areaM2PerContainerS150: 420,
      areaM2PerContainerS200: 380,
      totalKits: 10,
    });
    expect(r.numContainers).toBe(3);
    expect(r.kitsPerContainer).toBeCloseTo(10 / 3);
  });

  it("keeps fractional kits per container when containers exceed kits", () => {
    const r = deriveFclContainersFromWallM2({
      m2S80: 0,
      m2S150: 1260,
      m2S200: 0,
      areaM2PerContainerS80: 320,
      areaM2PerContainerS150: 420,
      areaM2PerContainerS200: 380,
      totalKits: 1,
    });
    expect(r.numContainers).toBe(3);
    expect(r.kitsPerContainer).toBeCloseTo(1 / 3);
  });
});
