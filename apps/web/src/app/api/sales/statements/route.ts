import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { getEffectiveOrganizationId, requireSession } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { requireSalesScopedOrganizationId, salesOrgScopeOrThrow } from "@/lib/sales-access";
import { buildStatementsResponse } from "@/lib/partner-sales";

async function statementsGetHandler(req: Request) {
  const user = (await requireSession()) as SessionUser;
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const entityId = url.searchParams.get("entityId") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const filters = { clientId, entityId, from, to };

  if (!user.isPlatformSuperadmin) {
    const organizationId = getEffectiveOrganizationId(user);
    if (!organizationId) {
      return NextResponse.json({ statements: [], entities: [], filters: {} });
    }
    const payload = await buildStatementsResponse(organizationId, filters);
    return NextResponse.json(payload);
  }

  const scoped = await requireSalesScopedOrganizationId(user, url);
  const organizationId = salesOrgScopeOrThrow(scoped);
  const payload = await buildStatementsResponse(organizationId, filters);
  return NextResponse.json(payload);
}

export const GET = withSaaSHandler({ module: "sales", rateLimitTier: "read" }, statementsGetHandler);
