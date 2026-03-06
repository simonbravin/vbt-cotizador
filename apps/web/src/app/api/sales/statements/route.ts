import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string };

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "";
  const entityId = url.searchParams.get("entityId") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  const where: Record<string, unknown> = { orgId: user.orgId };
  if (clientId) (where as any).clientId = clientId;
  if (from || to) {
    (where as any).createdAt = {};
    if (from) (where as any).createdAt.gte = new Date(from);
    if (to) {
      const d = new Date(to);
      d.setHours(23, 59, 59, 999);
      (where as any).createdAt.lte = d;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      invoices: { include: { entity: { select: { id: true, name: true, slug: true } } } },
      payments: { include: { entity: { select: { id: true, name: true, slug: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  let filtered = sales;
  if (entityId) {
    filtered = sales.filter(
      (s) =>
        s.invoices.some((i) => i.entityId === entityId) ||
        s.payments.some((p) => p.entityId === entityId)
    );
  }

  const byClient: Record<string, { client: { id: string; name: string }; sales: typeof filtered; totalInvoiced: number; totalPaid: number; balance: number }> = {};
  for (const sale of filtered) {
    const cid = sale.clientId;
    if (!byClient[cid]) {
      byClient[cid] = { client: sale.client, sales: [], totalInvoiced: 0, totalPaid: 0, balance: 0 };
    }
    byClient[cid].sales.push(sale);
    const invTotal = entityId
      ? sale.invoices.filter((i) => i.entityId === entityId).reduce((a, i) => a + i.amountUsd, 0)
      : sale.invoices.reduce((a, i) => a + i.amountUsd, 0);
    const payTotal = entityId
      ? sale.payments.filter((p) => p.entityId === entityId).reduce((a, p) => a + p.amountUsd, 0)
      : sale.payments.reduce((a, p) => a + p.amountUsd, 0);
    byClient[cid].totalInvoiced += invTotal;
    byClient[cid].totalPaid += payTotal;
    byClient[cid].balance += invTotal - payTotal;
  }

  const entities = await prisma.billingEntity.findMany({
    where: { orgId: user.orgId, isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { slug: "asc" },
  });

  return NextResponse.json({
    statements: Object.values(byClient),
    entities,
    filters: { clientId: clientId || null, entityId: entityId || null, from: from || null, to: to || null },
  });
}
