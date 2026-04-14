/**
 * Project activity log (canonical SaaS). Replaces legacy `GET /api/projects/[id]/audit`.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext, TenantError } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { ApiHttpError } from "@/lib/api-error";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function projectIdFromCtx(routeContext: unknown): Promise<string> {
  const p = (routeContext as RouteCtx).params;
  return (p instanceof Promise ? await p : p).id;
}

async function getHandler(_req: Request, routeContext: unknown) {
  const projectId = await projectIdFromCtx(routeContext);
  const ctx = await getTenantContext();
  if (!ctx) throw new TenantError("Unauthorized", "UNAUTHORIZED");

  const orgId = ctx.activeOrgId;
  if (!orgId && !ctx.isPlatformSuperadmin) {
    throw new TenantError("No active organization", "NO_ACTIVE_ORG");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...(orgId ? { organizationId: orgId } : {}) },
    select: { id: true },
  });
  if (!project) {
    throw new ApiHttpError(404, "RECORD_NOT_FOUND", "Project not found");
  }

  const logs = await prisma.activityLog.findMany({
    where: { entityType: "Project", entityId: projectId },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const entries = logs.map((l) => ({
    id: l.id,
    action: l.action,
    createdAt: l.createdAt,
    userName: l.user?.fullName ?? null,
    meta: l.metadataJson,
  }));

  return NextResponse.json({ entries });
}

export const GET = withSaaSHandler({ module: "projects", rateLimitTier: "read" }, getHandler);
