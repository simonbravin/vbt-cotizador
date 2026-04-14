import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSession, TenantError } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { ApiHttpError } from "@/lib/api-error";
import { saleOrganizationIdIfReadable, salesUserCanMutate } from "@/lib/sales-access";
import { SaleOrderStatus } from "@vbt/db";
import { z } from "zod";
import { refreshSaleComputedStatus } from "@/lib/partner-sales";

const postSchema = z.object({
  entityId: z.string().min(1),
  amountUsd: z.number().positive(),
  amountLocal: z.number().optional(),
  currencyLocal: z.string().optional(),
  exchangeRate: z.number().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function salePaymentsPostHandler(req: Request, routeContext: unknown) {
  const user = (await requireSession()) as SessionUser;
  if (!salesUserCanMutate(user)) {
    throw new TenantError("Forbidden", "FORBIDDEN");
  }

  const paramsMaybe = (routeContext as RouteCtx).params;
  const paramsObj = paramsMaybe instanceof Promise ? await paramsMaybe : paramsMaybe;
  const saleId = paramsObj.id;

  const organizationId = await saleOrganizationIdIfReadable(user, saleId);
  if (!organizationId) throw new ApiHttpError(404, "RECORD_NOT_FOUND", "Sale not found");

  const sale = await prisma.sale.findFirst({ where: { id: saleId, organizationId } });
  if (!sale) throw new ApiHttpError(404, "RECORD_NOT_FOUND", "Sale not found");
  if (sale.status === SaleOrderStatus.CANCELLED) {
    throw new ApiHttpError(400, "SALES_PAYMENT_CANCELLED_SALE", "Cannot add payment to cancelled sale.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiHttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiHttpError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.issues.map((issue) => ({
      path: issue.path.join(".") || undefined,
      message: issue.message,
    })));
  }
  const data = parsed.data;

  const ent = await prisma.billingEntity.findFirst({
    where: { id: data.entityId, organizationId, isActive: true },
  });
  if (!ent) throw new ApiHttpError(400, "SALES_INVALID_BILLING_ENTITY", "Invalid or inactive billing entity.");

  await prisma.payment.create({
    data: {
      organizationId,
      saleId,
      billingEntityId: data.entityId,
      amountUsd: data.amountUsd,
      amountLocal: data.amountLocal ?? null,
      currencyLocal: data.currencyLocal ?? null,
      exchangeRate: data.exchangeRate ?? null,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
      notes: data.notes ?? null,
      createdByUserId: user.id ?? null,
    },
  });

  if (sale.status === SaleOrderStatus.DRAFT) {
    await prisma.sale.update({
      where: { id: saleId },
      data: { status: SaleOrderStatus.CONFIRMED },
    });
  }

  await refreshSaleComputedStatus(saleId);
  return NextResponse.json({ ok: true });
}

export const POST = withSaaSHandler({ module: "sales", rateLimitTier: "create_update" }, salePaymentsPostHandler);
