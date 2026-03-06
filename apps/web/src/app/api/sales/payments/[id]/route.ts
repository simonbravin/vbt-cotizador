import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string; role: string };
  if (["VIEWER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const paymentId = params.id;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, orgId: user.orgId },
    select: { id: true, saleId: true, amountUsd: true, entityId: true },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  await prisma.payment.delete({ where: { id: paymentId } });

  const payments = await prisma.payment.findMany({
    where: { saleId: payment.saleId },
    select: { amountUsd: true, entityId: true },
  });
  const invoices = await prisma.saleInvoice.findMany({
    where: { saleId: payment.saleId },
    select: { amountUsd: true, entityId: true },
  });
  const byEntity: Record<string, { inv: number; pay: number }> = {};
  for (const i of invoices) {
    byEntity[i.entityId] = byEntity[i.entityId] ?? { inv: 0, pay: 0 };
    byEntity[i.entityId].inv += i.amountUsd;
  }
  for (const p of payments) {
    byEntity[p.entityId] = byEntity[p.entityId] ?? { inv: 0, pay: 0 };
    byEntity[p.entityId].pay += p.amountUsd;
  }
  let allPaid = true;
  for (const v of Object.values(byEntity)) {
    if (v.pay < v.inv) allPaid = false;
  }
  const newStatus = allPaid ? "PAID" : payments.length === 0 ? "CONFIRMED" : "PARTIALLY_PAID";
  await prisma.sale.update({
    where: { id: payment.saleId },
    data: { status: newStatus as any },
  });

  return new NextResponse(null, { status: 204 });
}
