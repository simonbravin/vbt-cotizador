import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string };

  const where = { orgId: user.orgId, status: { not: "CANCELLED" as const } };

  const [sales, payments, invoices] = await Promise.all([
    prisma.sale.findMany({ where, select: { id: true, status: true, landedDdpUsd: true, clientId: true } }),
    prisma.payment.findMany({
      where: { sale: { orgId: user.orgId, status: { not: "CANCELLED" as const } } },
      select: { amountUsd: true, entityId: true },
    }),
    prisma.saleInvoice.findMany({
      where: { sale: { orgId: user.orgId, status: { not: "CANCELLED" as const } } },
      select: { amountUsd: true, entityId: true },
    }),
  ]);

  const totalValue = sales.reduce((a, s) => a + s.landedDdpUsd, 0);
  const totalPaid = payments.reduce((a, p) => a + p.amountUsd, 0);
  const totalInvoiced = invoices.reduce((a, i) => a + i.amountUsd, 0);
  const byStatus: Record<string, number> = {};
  for (const s of sales) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  }
  const byEntityPaid: Record<string, number> = {};
  const byEntityInvoiced: Record<string, number> = {};
  for (const p of payments) byEntityPaid[p.entityId] = (byEntityPaid[p.entityId] ?? 0) + p.amountUsd;
  for (const i of invoices) byEntityInvoiced[i.entityId] = (byEntityInvoiced[i.entityId] ?? 0) + i.amountUsd;

  const entities = await prisma.billingEntity.findMany({
    where: { orgId: user.orgId },
    select: { id: true, name: true, slug: true },
  });
  const entitySummary = entities.map((e) => ({
    ...e,
    invoiced: byEntityInvoiced[e.id] ?? 0,
    paid: byEntityPaid[e.id] ?? 0,
    balance: (byEntityInvoiced[e.id] ?? 0) - (byEntityPaid[e.id] ?? 0),
  }));

  return NextResponse.json({
    totalSales: sales.length,
    totalValue,
    totalInvoiced,
    totalPaid,
    totalPending: totalInvoiced - totalPaid,
    byStatus,
    entitySummary,
  });
}
