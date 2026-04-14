import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSession, TenantError } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { ApiHttpError } from "@/lib/api-error";
import { saleOrganizationIdIfReadable, salesUserCanMutate } from "@/lib/sales-access";
import { z } from "zod";
import { refreshSaleComputedStatus } from "@/lib/partner-sales";

const postSchema = z.object({
  entityId: z.string().min(1),
  amountUsd: z.number().min(0),
  dueDate: z.string().optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function saleInvoicesPostHandler(req: Request, routeContext: unknown) {
  const user = (await requireSession()) as SessionUser;
  if (!salesUserCanMutate(user)) {
    throw new TenantError("Forbidden", "FORBIDDEN");
  }

  const paramsMaybe = (routeContext as RouteCtx).params;
  const paramsObj = paramsMaybe instanceof Promise ? await paramsMaybe : paramsMaybe;
  const saleId = paramsObj.id;

  const organizationId = await saleOrganizationIdIfReadable(user, saleId);
  if (!organizationId) throw new ApiHttpError(404, "RECORD_NOT_FOUND", "Sale not found");

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId },
    include: { _count: { select: { payments: true } } },
  });
  if (!sale) throw new ApiHttpError(404, "RECORD_NOT_FOUND", "Sale not found");
  if (sale._count.payments > 0) {
    throw new ApiHttpError(400, "SALES_INVOICE_PAYMENTS_LOCKED", "Cannot add invoices when payments exist.");
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

  await prisma.saleInvoice.create({
    data: {
      saleId,
      billingEntityId: data.entityId,
      amountUsd: data.amountUsd,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      sequence: data.sequence ?? 1,
      referenceNumber: data.referenceNumber ?? null,
      notes: data.notes ?? null,
    },
  });
  await refreshSaleComputedStatus(saleId);
  return NextResponse.json({ ok: true });
}

export const POST = withSaaSHandler({ module: "sales", rateLimitTier: "create_update" }, saleInvoicesPostHandler);
