import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInvoicedAmount, roundMoney } from "@/lib/sales";
import { z } from "zod";

const createSchema = z.object({
  entityId: z.string().min(1),
  amountUsd: z.number().min(0),
  dueDate: z.string().optional().nullable(),
  sequence: z.number().int().min(1).optional().default(1),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string; role: string };
  if (["VIEWER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: saleId } = await params;

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, orgId: user.orgId },
    select: {
      id: true,
      status: true,
      invoicedBasis: true,
      exwUsd: true,
      fobUsd: true,
      cifUsd: true,
      landedDdpUsd: true,
    },
  });
  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  if (sale.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot add invoices to a cancelled sale" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existingInvoices = await prisma.saleInvoice.findMany({
    where: { saleId },
    select: { amountUsd: true },
  });
  const currentSum = existingInvoices.reduce((a, i) => a + i.amountUsd, 0);
  const maxInvoiced = roundMoney(getInvoicedAmount(sale));
  if (roundMoney(currentSum + parsed.data.amountUsd) > maxInvoiced) {
    return NextResponse.json(
      {
        error: `Sum of invoice amounts would exceed invoiced amount for this sale (max ${maxInvoiced.toFixed(2)} USD for current sales condition).`,
      },
      { status: 400 }
    );
  }

  const entity = await prisma.billingEntity.findFirst({
    where: { id: parsed.data.entityId, orgId: user.orgId },
  });
  if (!entity) {
    return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
  }

  const invoice = await prisma.saleInvoice.create({
    data: {
      saleId,
      entityId: parsed.data.entityId,
      amountUsd: roundMoney(parsed.data.amountUsd),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      sequence: parsed.data.sequence ?? 1,
      referenceNumber: parsed.data.referenceNumber ?? null,
      notes: parsed.data.notes ?? null,
    },
    include: { entity: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json(invoice, { status: 201 });
}
