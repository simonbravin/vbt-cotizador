import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { getEffectiveOrganizationId, requireSession } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { requireSalesScopedOrganizationId } from "@/lib/sales-access";
import { salesSummaryForOrg } from "@/lib/partner-sales";

const emptySummary = {
  totalSales: 0,
  totalValue: 0,
  totalInvoiced: 0,
  totalPaid: 0,
  totalPending: 0,
  byStatus: {} as Record<string, number>,
  entitySummary: [] as unknown[],
};

async function salesSummaryGetHandler(req: Request) {
  const user = (await requireSession()) as SessionUser;
  const url = new URL(req.url);

  if (!user.isPlatformSuperadmin) {
    const organizationId = getEffectiveOrganizationId(user);
    if (!organizationId) {
      return NextResponse.json(emptySummary);
    }
    const summary = await salesSummaryForOrg(organizationId);
    return NextResponse.json(summary);
  }

  const scoped = await requireSalesScopedOrganizationId(user, url);
  if (!scoped.ok) {
    return NextResponse.json(emptySummary);
  }
  const summary = await salesSummaryForOrg(scoped.organizationId);
  return NextResponse.json(summary);
}

export const GET = withSaaSHandler({ module: "sales", rateLimitTier: "read" }, salesSummaryGetHandler);
