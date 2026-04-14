import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSession, TenantError } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { ApiHttpError } from "@/lib/api-error";
import { paymentRecordIfMutable, salesUserCanMutate } from "@/lib/sales-access";
import { refreshSaleComputedStatus } from "@/lib/partner-sales";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function paymentDeleteHandler(_req: Request, routeContext: unknown) {
  const user = (await requireSession()) as SessionUser;

  if (!salesUserCanMutate(user)) {
    throw new TenantError("Forbidden", "FORBIDDEN");
  }

  const paramsMaybe = (routeContext as RouteCtx).params;
  const paramsObj = paramsMaybe instanceof Promise ? await paramsMaybe : paramsMaybe;
  const paymentId = paramsObj.id;

  const payment = await paymentRecordIfMutable(user, paymentId);
  if (!payment) throw new ApiHttpError(404, "RECORD_NOT_FOUND", "Payment not found");

  await prisma.payment.delete({ where: { id: paymentId } });
  await refreshSaleComputedStatus(payment.saleId);
  return NextResponse.json({ ok: true });
}

export const DELETE = withSaaSHandler({ module: "sales", rateLimitTier: "create_update" }, paymentDeleteHandler);
