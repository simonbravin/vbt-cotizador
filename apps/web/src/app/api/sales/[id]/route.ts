import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const saleStatusEnum = z.enum(["DRAFT", "CONFIRMED", "PARTIALLY_PAID", "PAID", "CANCELLED"]);

const invoiceSchema = z.object({
  id: z.string().optional(),
  entityId: z.string(),
  amountUsd: z.number().min(0),
  dueDate: z.string().optional().nullable(),
  sequence: z.number().int().min(1).optional().default(1),
  notes: z.string().optional().nullable(),
});

const updateSchema = z.object({
  status: saleStatusEnum.optional(),
  exwUsd: z.number().min(0).optional(),
  commissionPct: z.number().min(0).optional(),
  commissionAmountUsd: z.number().min(0).optional(),
  fobUsd: z.number().min(0).optional(),
  freightUsd: z.number().min(0).optional(),
  cifUsd: z.number().min(0).optional(),
  taxesFeesUsd: z.number().min(0).optional(),
  landedDdpUsd: z.number().min(0).optional(),
  taxBreakdownJson: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
  invoices: z.array(invoiceSchema).optional(),
}).partial();

function computeInvoiceStatus(
  invoices: { amountUsd: number; entityId: string }[],
  payments: { amountUsd: number; entityId: string }[]
): Record<string, { paid: number; invoiced: number; status: string }> {
  const byEntity: Record<string, { paid: number; invoiced: number }> = {};
  for (const inv of invoices) {
    byEntity[inv.entityId] = byEntity[inv.entityId] ?? { paid: 0, invoiced: 0 };
    byEntity[inv.entityId].invoiced += inv.amountUsd;
  }
  for (const p of payments) {
    byEntity[p.entityId] = byEntity[p.entityId] ?? { paid: 0, invoiced: 0 };
    byEntity[p.entityId].paid += p.amountUsd;
  }
  const result: Record<string, { paid: number; invoiced: number; status: string }> = {};
  for (const [eid, v] of Object.entries(byEntity)) {
    result[eid] = {
      ...v,
      status: v.paid >= v.invoiced ? "PAID" : v.paid > 0 ? "PARTIAL" : "PENDING",
    };
  }
  return result;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string };
  const { id } = params;

  const sale = await prisma.sale.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      client: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      quote: { select: { id: true, quoteNumber: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
      invoices: { include: { entity: { select: { id: true, name: true, slug: true } } } },
      payments: { include: { entity: { select: { id: true, name: true, slug: true } } } },
    },
  });

  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const invoiceStatusByEntity = computeInvoiceStatus(
    sale.invoices.map((i) => ({ amountUsd: i.amountUsd, entityId: i.entityId })),
    sale.payments.map((p) => ({ amountUsd: p.amountUsd, entityId: p.entityId }))
  );

  return NextResponse.json({
    ...sale,
    invoiceStatusByEntity,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string; id: string; role: string };
  if (["VIEWER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.sale.findFirst({
    where: { id, orgId: user.orgId },
    include: { invoices: true },
  });
  if (!existing) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;

  const updatePayload: Record<string, unknown> = {};
  if (data.status != null) updatePayload.status = data.status;
  if (data.exwUsd != null) updatePayload.exwUsd = data.exwUsd;
  if (data.commissionPct != null) updatePayload.commissionPct = data.commissionPct;
  if (data.commissionAmountUsd != null) updatePayload.commissionAmountUsd = data.commissionAmountUsd;
  if (data.fobUsd != null) updatePayload.fobUsd = data.fobUsd;
  if (data.freightUsd != null) updatePayload.freightUsd = data.freightUsd;
  if (data.cifUsd != null) updatePayload.cifUsd = data.cifUsd;
  if (data.taxesFeesUsd != null) updatePayload.taxesFeesUsd = data.taxesFeesUsd;
  if (data.landedDdpUsd != null) updatePayload.landedDdpUsd = data.landedDdpUsd;
  if (data.taxBreakdownJson !== undefined) updatePayload.taxBreakdownJson = data.taxBreakdownJson;
  if (data.notes !== undefined) updatePayload.notes = data.notes;

  if (data.invoices != null) {
    await prisma.$transaction(async (tx) => {
      await tx.saleInvoice.deleteMany({ where: { saleId: id } });
      for (const inv of data.invoices!) {
        const entity = await tx.billingEntity.findFirst({
          where: { id: inv.entityId, orgId: user.orgId },
        });
        if (entity) {
          await tx.saleInvoice.create({
            data: {
              saleId: id,
              entityId: inv.entityId,
              amountUsd: inv.amountUsd,
              dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
              sequence: inv.sequence ?? 1,
              notes: inv.notes ?? null,
            },
          });
        }
      }
    });
  }

  const updated = await prisma.sale.update({
    where: { id },
    data: updatePayload as any,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      quote: { select: { id: true, quoteNumber: true } },
      invoices: { include: { entity: { select: { id: true, name: true, slug: true } } } },
      payments: { include: { entity: { select: { id: true, name: true, slug: true } } } },
    },
  });

  await createAuditLog({
    orgId: user.orgId,
    userId: user.id,
    action: "SALE_UPDATED" as any,
    entityType: "Sale",
    entityId: id,
    meta: { changed: Object.keys(updatePayload) },
  });

  return NextResponse.json(updated);
}
