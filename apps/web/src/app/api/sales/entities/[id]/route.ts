import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[A-Z0-9_]+$/i).optional(),
  isActive: z.boolean().optional(),
}).partial();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string };
  const entity = await prisma.billingEntity.findFirst({
    where: { id: params.id, orgId: user.orgId },
  });
  if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  return NextResponse.json(entity);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string; role: string };
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;
  if (data.slug != null) {
    const slug = data.slug.toUpperCase();
    const existing = await prisma.billingEntity.findFirst({
      where: { orgId: user.orgId, slug, id: { not: params.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Another entity with this slug exists" }, { status: 400 });
    }
    (data as any).slug = slug;
  }
  const entity = await prisma.billingEntity.update({
    where: { id: params.id },
    data: data as any,
  });
  return NextResponse.json(entity);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string; role: string };
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const entity = await prisma.billingEntity.findFirst({
    where: { id: params.id, orgId: user.orgId },
  });
  if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  const used = await prisma.saleInvoice.count({ where: { entityId: params.id } });
  if (used > 0) {
    return NextResponse.json({ error: "Entity is in use and cannot be deleted" }, { status: 400 });
  }
  await prisma.billingEntity.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
