import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const quote = await prisma.quote.findFirst({
    where: { id: params.id, orgId: user.orgId },
    select: { id: true },
  });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const logs = await prisma.auditLog.findMany({
    where: { entityType: "Quote", entityId: params.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      createdAt: l.createdAt,
      userName: l.user?.name ?? null,
      meta: l.meta,
    }))
  );
}
