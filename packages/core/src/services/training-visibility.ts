import type { Prisma, PrismaClient } from "@vbt/db";

const PARTNER_ORG_TYPES = ["commercial_partner", "master_partner"] as const;

const MODULE_KEYS = [
  "dashboard",
  "clients",
  "engineering",
  "projects",
  "quotes",
  "sales",
  "inventory",
  "documents",
  "training",
  "reports",
  "settings",
] as const;
export type PartnerModuleVisibility = Record<(typeof MODULE_KEYS)[number], boolean>;

/** Default-on when unset (matches partner form defaults). */
export async function resolvePartnerModuleVisibility(
  prisma: PrismaClient,
  organizationId: string
): Promise<PartnerModuleVisibility> {
  const row = await prisma.platformConfig.findFirst({ select: { configJson: true } });
  const globalMv = (row?.configJson as { moduleVisibility?: Record<string, boolean> } | undefined)
    ?.moduleVisibility;

  const profile = await prisma.partnerProfile.findUnique({
    where: { organizationId },
    select: { moduleVisibility: true },
  });
  const override = profile?.moduleVisibility as Record<string, boolean> | null | undefined;
  return {
    dashboard: typeof override?.dashboard === "boolean" ? override.dashboard : globalMv?.dashboard !== false,
    clients: typeof override?.clients === "boolean" ? override.clients : globalMv?.clients !== false,
    engineering: typeof override?.engineering === "boolean" ? override.engineering : globalMv?.engineering !== false,
    projects: typeof override?.projects === "boolean" ? override.projects : globalMv?.projects !== false,
    quotes: typeof override?.quotes === "boolean" ? override.quotes : globalMv?.quotes !== false,
    sales: typeof override?.sales === "boolean" ? override.sales : globalMv?.sales !== false,
    inventory: typeof override?.inventory === "boolean" ? override.inventory : globalMv?.inventory !== false,
    documents: typeof override?.documents === "boolean" ? override.documents : globalMv?.documents !== false,
    training: typeof override?.training === "boolean" ? override.training : globalMv?.training !== false,
    reports: typeof override?.reports === "boolean" ? override.reports : globalMv?.reports !== false,
    settings: typeof override?.settings === "boolean" ? override.settings : globalMv?.settings !== false,
  };
}

export async function resolveTrainingModuleVisible(
  prisma: PrismaClient,
  organizationId: string
): Promise<boolean> {
  const visibility = await resolvePartnerModuleVisibility(prisma, organizationId);
  return visibility.training;
}

export async function assertPartnerOrgIds(
  prisma: PrismaClient,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const rows = await prisma.organization.findMany({
    where: { id: { in: ids }, organizationType: { in: [...PARTNER_ORG_TYPES] } },
    select: { id: true },
  });
  if (rows.length !== ids.length) {
    throw new Error("Invalid partner organization ids for training allowlist");
  }
}

/** Programs a partner user may see in the catalog. */
export function trainingProgramVisibleToPartnerWhere(organizationId: string): Prisma.TrainingProgramWhereInput {
  return {
    AND: [
      {
        OR: [{ publishedAt: { not: null } }, { status: "active", publishedAt: null }],
      },
      { status: { notIn: ["draft", "archived"] } },
      {
        OR: [
          { visibility: "all_partners" },
          {
            visibility: "selected_partners",
            allowedOrganizations: { some: { organizationId } },
          },
        ],
      },
    ],
  };
}

export function quizDefinitionVisibleToPartnerWhere(organizationId: string): Prisma.QuizDefinitionWhereInput {
  return {
    AND: [
      { status: "published" },
      { publishedAt: { not: null } },
      {
        OR: [
          { visibility: "all_partners" },
          {
            visibility: "selected_partners",
            allowedOrganizations: { some: { organizationId } },
          },
        ],
      },
    ],
  };
}
