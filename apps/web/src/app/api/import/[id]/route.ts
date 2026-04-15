import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext, TenantError, tenantErrorStatus } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function importIdFromCtx(routeContext: unknown): Promise<string> {
  const p = (routeContext as RouteCtx).params;
  return (p instanceof Promise ? await p : p).id;
}

export async function GET(_req: Request, routeContext: unknown) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = ctx.activeOrgId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization. Select an organization.", code: "NO_ACTIVE_ORG" },
        { status: 400 }
      );
    }
    const id = await importIdFromCtx(routeContext);

    const revitImport = await prisma.revitImport.findFirst({
      where: { id, organizationId },
      include: {
        lines: {
          include: {
            catalogPiece: {
              select: {
                id: true,
                canonicalName: true,
                systemCode: true,
                dieNumber: true,
              },
            },
          },
          orderBy: { rowNum: "asc" },
        },
      },
    });

    if (!revitImport) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    return NextResponse.json(revitImport);
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: tenantErrorStatus(e) });
    }
    console.error("[api/import/[id] GET]", e);
    return NextResponse.json({ error: "Failed to load import" }, { status: 500 });
  }
}
