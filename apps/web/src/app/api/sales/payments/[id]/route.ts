import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireModuleRouteAuth } from "@/lib/module-route-auth";
import { paymentRecordIfMutable, salesUserCanMutate } from "@/lib/sales-access";
import { refreshSaleComputedStatus } from "@/lib/partner-sales";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await requireModuleRouteAuth("sales");
  if (!auth.ok) return auth.response;
  const user = auth.user as SessionUser;

  if (!salesUserCanMutate(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: paymentId } = params instanceof Promise ? await params : params;
  const payment = await paymentRecordIfMutable(user, paymentId);
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.payment.delete({ where: { id: paymentId } });
  await refreshSaleComputedStatus(payment.saleId);
  return NextResponse.json({ ok: true });
}
