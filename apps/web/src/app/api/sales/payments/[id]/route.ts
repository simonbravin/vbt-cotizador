import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInvoicedAmount } from "@/lib/sales";

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
    select: { amountUsd: true },
  });
  const sale = await prisma.sale.findFirst({
    where: { id: payment.saleId, orgId: user.orgId },
    select: { exwUsd: true, fobUsd: true, cifUsd: true, landedDdpUsd: true, invoicedBasis: true },
  });
  const totalPaid = payments.reduce((a, p) => a + p.amountUsd, 0);
  const invoicedAmount = sale ? getInvoicedAmount(sale) : 0;
  const allPaid = totalPaid >= invoicedAmount;
  const newStatus = allPaid ? "PAID" : payments.length === 0 ? "CONFIRMED" : "PARTIALLY_PAID";
  await prisma.sale.update({
    where: { id: payment.saleId },
    data: { status: newStatus as any },
  });

  return new NextResponse(null, { status: 204 });
}
