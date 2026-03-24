import { prisma } from "@/lib/db";
import { TenantError } from "@/lib/tenant";
import { resolvePartnerModuleVisibility } from "@vbt/core";

export type PartnerModuleKey =
  | "dashboard"
  | "clients"
  | "engineering"
  | "projects"
  | "quotes"
  | "sales"
  | "inventory"
  | "documents"
  | "training"
  | "reports"
  | "settings";

type ModuleAccessContext = {
  activeOrgId?: string | null;
  isPlatformSuperadmin?: boolean;
};

export async function assertPartnerModuleEnabled(
  module: PartnerModuleKey,
  ctx: ModuleAccessContext
): Promise<void> {
  if (ctx.isPlatformSuperadmin) return;
  if (!ctx.activeOrgId) {
    throw new TenantError("No active organization", "NO_ACTIVE_ORG");
  }
  const visibility = await resolvePartnerModuleVisibility(prisma, ctx.activeOrgId);
  if (visibility[module] === false) {
    console.warn("[module-access] blocked", { module, organizationId: ctx.activeOrgId });
    throw new TenantError("Module disabled for this organization", "FORBIDDEN");
  }
}

