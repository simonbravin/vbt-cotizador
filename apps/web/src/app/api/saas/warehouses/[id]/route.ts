import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext, TenantError, tenantErrorStatus } from "@/lib/tenant";

async function getOrgId(ctx: Awaited<ReturnType<typeof getTenantContext>>, bodyOrganizationId?: string): Promise<string | null> {
  if (!ctx) return null;
  if (ctx.isPlatformSuperadmin && bodyOrganizationId) return bodyOrganizationId;
  return ctx.activeOrgId;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const warehouse = await prisma.warehouse.findUnique({ where: { id: params.id } });
    if (!warehouse) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const orgId = await getOrgId(ctx);
    if (!orgId || warehouse.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const location = typeof body.location === "string" ? body.location.trim() || null : undefined;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
    const updated = await prisma.warehouse.update({
      where: { id: params.id },
      data: { ...(name !== undefined && { name }), ...(location !== undefined && { location }), ...(isActive !== undefined && { isActive }) },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    console.error("[api/saas/warehouses PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const warehouse = await prisma.warehouse.findUnique({ where: { id: params.id } });
    if (!warehouse) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const orgId = await getOrgId(ctx);
    if (!orgId || warehouse.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.warehouse.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    console.error("[api/saas/warehouses DELETE]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
