import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { getEffectiveOrganizationId } from "@/lib/tenant";
import { requireModuleRouteAuth } from "@/lib/module-route-auth";
import { requireSalesScopedOrganizationId } from "@/lib/sales-access";
import { buildStatementsResponse } from "@/lib/partner-sales";

export async function GET(req: Request) {
  const auth = await requireModuleRouteAuth("sales");
  if (!auth.ok) return auth.response;
  const user = auth.user as SessionUser;
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
  if (!scoped.ok) {
    return NextResponse.json({ error: scoped.error }, { status: scoped.status });
  }
  const payload = await buildStatementsResponse(scoped.organizationId, filters);
  return NextResponse.json(payload);
}
