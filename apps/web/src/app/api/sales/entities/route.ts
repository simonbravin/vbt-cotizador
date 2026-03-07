import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[A-Z0-9_]+$/i),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string };

  const entities = await prisma.billingEntity.findMany({
    where: { orgId: user.orgId },
    orderBy: { slug: "asc" },
  });
  return NextResponse.json(entities);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string; role: string };
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const slug = parsed.data.slug.toUpperCase();
  const existing = await prisma.billingEntity.findUnique({
    where: { orgId_slug: { orgId: user.orgId, slug } },
  });
  if (existing) {
    return NextResponse.json({ error: "Entity with this slug already exists" }, { status: 400 });
  }

  const entity = await prisma.billingEntity.create({
    data: {
      orgId: user.orgId,
      name: parsed.data.name,
      slug,
      isActive: true,
    },
  });
  return NextResponse.json(entity);
}
