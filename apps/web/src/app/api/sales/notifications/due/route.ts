import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string };

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "7", 10) || 7, 90);
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + days);

  const invoices = await prisma.saleInvoice.findMany({
    where: {
      sale: { orgId: user.orgId, status: { notIn: ["CANCELLED", "PAID"] } },
      dueDate: { gte: from, lte: to },
    },
    include: {
      sale: {
        select: {
          id: true,
          saleNumber: true,
          clientId: true,
          client: { select: { name: true } },
        },
      },
      entity: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const paymentsBySaleEntity: Record<string, number> = {};
  if (invoices.length > 0) {
    const saleIds = [...new Set(invoices.map((i) => i.saleId))];
    const payments = await prisma.payment.findMany({
      where: { saleId: { in: saleIds } },
      select: { saleId: true, entityId: true, amountUsd: true },
    });
    for (const p of payments) {
      const key = `${p.saleId}:${p.entityId}`;
      paymentsBySaleEntity[key] = (paymentsBySaleEntity[key] ?? 0) + p.amountUsd;
    }
  }

  const result = invoices.map((inv) => {
    const key = `${inv.saleId}:${inv.entityId}`;
    const paid = paymentsBySaleEntity[key] ?? 0;
    const invoicedTotal = invoices
      .filter((i) => i.saleId === inv.saleId && i.entityId === inv.entityId)
      .reduce((a, i) => a + i.amountUsd, 0);
    const pending = invoicedTotal - paid;
    return {
      id: inv.id,
      saleId: inv.saleId,
      saleNumber: inv.sale?.saleNumber,
      clientName: inv.sale?.client?.name,
      entityName: inv.entity.name,
      amountUsd: inv.amountUsd,
      dueDate: inv.dueDate,
      sequence: inv.sequence,
      pendingForEntity: pending > 0,
    };
  });

  return NextResponse.json({
    count: result.length,
    items: result,
    days,
  });
}
