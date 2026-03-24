import { describe, expect, it } from "vitest";
import { resolvePartnerModuleVisibility } from "../src/services/training-visibility";

function buildPrismaMock(args: {
  global?: Record<string, boolean>;
  override?: Record<string, boolean> | null;
}) {
  return {
    platformConfig: {
      findFirst: async () => ({
        configJson: {
          moduleVisibility: args.global ?? {},
        },
      }),
    },
    partnerProfile: {
      findUnique: async () => ({
        moduleVisibility: args.override ?? null,
      }),
    },
  } as any;
}

describe("resolvePartnerModuleVisibility", () => {
  it("defaults modules to true when not configured", async () => {
    const prisma = buildPrismaMock({});
    const visibility = await resolvePartnerModuleVisibility(prisma, "org_1");
    expect(visibility.dashboard).toBe(true);
    expect(visibility.clients).toBe(true);
    expect(visibility.projects).toBe(true);
    expect(visibility.quotes).toBe(true);
    expect(visibility.inventory).toBe(true);
    expect(visibility.settings).toBe(true);
  });

  it("applies global defaults when partner override missing", async () => {
    const prisma = buildPrismaMock({
      global: { sales: false, reports: false, projects: false },
      override: null,
    });
    const visibility = await resolvePartnerModuleVisibility(prisma, "org_2");
    expect(visibility.sales).toBe(false);
    expect(visibility.reports).toBe(false);
    expect(visibility.projects).toBe(false);
    expect(visibility.documents).toBe(true);
  });

  it("partner override wins over global", async () => {
    const prisma = buildPrismaMock({
      global: { sales: false, settings: false },
      override: { sales: true, settings: true, inventory: false },
    });
    const visibility = await resolvePartnerModuleVisibility(prisma, "org_3");
    expect(visibility.sales).toBe(true);
    expect(visibility.settings).toBe(true);
    expect(visibility.inventory).toBe(false);
  });
});

