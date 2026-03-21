import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformSuperadmin, TenantError, tenantErrorStatus } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";

/**
 * GET: platform superadmin users (for engineering assignment, etc.).
 */
async function getHandler(_req: Request) {
  try {
    await requirePlatformSuperadmin();
    const users = await prisma.user.findMany({
      where: { isPlatformSuperadmin: true, isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    throw e;
  }
}

export const GET = withSaaSHandler({ rateLimitTier: "read" }, getHandler);
