import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireModuleRouteAuth } from "@/lib/module-route-auth";
import {
  resolveOrganizationIdForSaleCreate,
  salesListWhere,
  salesUserCanMutate,
} from "@/lib/sales-access";
import type { Prisma } from "@vbt/db";
import { SaleOrderStatus } from "@vbt/db";
import { z } from "zod";
import {
  ensureBillingEntities,
  nextSaleNumber,
  refreshSaleComputedStatus,
  serializeSaleListRow,
} from "@/lib/partner-sales";
import { resolveMultiProjectSaleLines } from "@/lib/sale-multi-project";
import { parseSaleListDateEnd, parseSaleListDateStart } from "@/lib/sale-list-date-filters";

const projectLineSchema = z.object({
  projectId: z.string().min(1),
  containerSharePct: z.number().min(0).max(100).nullable().optional(),
});

const postSchema = z
  .object({
    clientId: z.string().min(1),
    projectId: z.string().optional(),
    projectLines: z.preprocess(
      (val) => (Array.isArray(val) && val.length === 0 ? undefined : val),
      z.array(projectLineSchema).min(1).optional()
    ),
    quoteId: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
    status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
    exwUsd: z.number().optional(),
    commissionPct: z.number().optional(),
    commissionAmountUsd: z.number().optional(),
    fobUsd: z.number().optional(),
    freightUsd: z.number().optional(),
    cifUsd: z.number().optional(),
    taxesFeesUsd: z.number().optional(),
    landedDdpUsd: z.number().optional(),
    invoicedBasis: z.enum(["EXW", "FOB", "CIF", "DDP"]).optional(),
    notes: z.string().optional(),
    /** Platform superadmin: create sale in this org (alternatively ?organizationId= or active-org cookie). */
    organizationId: z.string().optional(),
    invoices: z
      .array(
        z.object({
          entityId: z.string().min(1),
          amountUsd: z.number().min(0),
          dueDate: z.string().optional().nullable(),
          sequence: z.number().int().min(1).optional(),
          referenceNumber: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .optional(),
  })
  .superRefine((val, ctx) => {
    const multi = (val.projectLines?.length ?? 0) > 0;
    const single = Boolean(val.projectId?.trim());
    if (multi && single) {
      ctx.addIssue({ code: "custom", message: "Send either projectId or projectLines, not both", path: ["projectLines"] });
    }
    if (!multi && !single) {
      ctx.addIssue({ code: "custom", message: "projectId or projectLines is required", path: ["projectId"] });
    }
    if (!multi) {
      const need: (keyof typeof val)[] = [
        "exwUsd",
        "commissionPct",
        "commissionAmountUsd",
        "fobUsd",
        "freightUsd",
        "cifUsd",
        "taxesFeesUsd",
        "landedDdpUsd",
      ];
      for (const k of need) {
        if (val[k] === undefined) {
          ctx.addIssue({ code: "custom", message: `${String(k)} is required`, path: [String(k)] });
        }
      }
    }
  });

function parseStatus(s: string | null): SaleOrderStatus | undefined {
  if (!s) return undefined;
  const up = s.toUpperCase();
  const map: Record<string, SaleOrderStatus> = {
    DRAFT: SaleOrderStatus.DRAFT,
    CONFIRMED: SaleOrderStatus.CONFIRMED,
    PARTIALLY_PAID: SaleOrderStatus.PARTIALLY_PAID,
    PAID: SaleOrderStatus.PAID,
    DUE: SaleOrderStatus.DUE,
    CANCELLED: SaleOrderStatus.CANCELLED,
  };
  return map[up];
}

export async function GET(req: Request) {
  const auth = await requireModuleRouteAuth("sales");
  if (!auth.ok) return auth.response;
  const user = auth.user as SessionUser;

  const url = new URL(req.url);
  const baseWhere = await salesListWhere(user, url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const statusParam = url.searchParams.get("status");
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const search = (url.searchParams.get("search") ?? "").trim();

  const status = parseStatus(statusParam);
  const createdAt: { gte?: Date; lte?: Date } = {};
  const gte = parseSaleListDateStart(from);
  const lte = parseSaleListDateEnd(to);
  if (gte) createdAt.gte = gte;
  if (lte) createdAt.lte = lte;
  const hasCreatedAtFilter = Boolean(createdAt.gte ?? createdAt.lte);

  const where: Prisma.SaleWhereInput = {
    ...baseWhere,
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...(hasCreatedAtFilter ? { createdAt } : {}),
  };

  const andExtra: Prisma.SaleWhereInput[] = [];
  if (projectId) {
    andExtra.push({
      OR: [{ projectId }, { saleProjectLines: { some: { projectId } } }],
    });
  }
  if (search) {
    andExtra.push({
      OR: [
        { saleNumber: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
        { project: { projectName: { contains: search, mode: "insensitive" } } },
        {
          saleProjectLines: {
            some: { project: { projectName: { contains: search, mode: "insensitive" } } },
          },
        },
      ],
    });
  }
  if (andExtra.length) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...andExtra];
  }

  const [total, rows] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, projectName: true } },
        quote: { select: { id: true, quoteNumber: true } },
        saleProjectLines: {
          orderBy: { sortOrder: "asc" },
          include: { project: { select: { id: true, projectName: true } } },
        },
        organization: { select: { id: true, name: true } },
        _count: { select: { invoices: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    sales: rows.map(serializeSaleListRow),
    total,
  });
}

export async function POST(req: Request) {
  const auth = await requireModuleRouteAuth("sales");
  if (!auth.ok) return auth.response;
  const user = auth.user as SessionUser;

  if (!salesUserCanMutate(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }

  const data = parsed.data;
  const url = new URL(req.url);
  const orgResolved = await resolveOrganizationIdForSaleCreate(user, url, data.organizationId);
  if (!orgResolved.ok) {
    return NextResponse.json({ error: orgResolved.error }, { status: orgResolved.status });
  }
  const organizationId = orgResolved.organizationId;
  const clientRow = await prisma.client.findFirst({
    where: { id: data.clientId, organizationId },
    select: { id: true },
  });
  if (!clientRow) return NextResponse.json({ error: "Client not found" }, { status: 400 });

  const isMulti = (data.projectLines?.length ?? 0) > 0;

  let primaryProjectId: string;
  let headerQuoteId: string | null;
  let exwUsd: number;
  let commissionPct: number;
  let commissionAmountUsd: number;
  let fobUsd: number;
  let freightUsd: number;
  let cifUsd: number;
  let taxesFeesUsd: number;
  let landedDdpUsd: number;
  let resolvedLinesForCreate: { projectId: string; quoteId: string | null; containerSharePct: number | null; sortOrder: number }[];

  if (isMulti) {
    try {
      const { financials, resolvedLines } = await resolveMultiProjectSaleLines(
        prisma,
        organizationId,
        data.clientId,
        data.projectLines!,
        data.quantity,
        !user.isPlatformSuperadmin
      );
      primaryProjectId = resolvedLines[0]!.projectId;
      headerQuoteId = resolvedLines[0]!.quoteId;
      exwUsd = financials.exwUsd;
      commissionPct = financials.commissionPct;
      commissionAmountUsd = financials.commissionAmountUsd;
      fobUsd = financials.fobUsd;
      freightUsd = financials.freightUsd;
      cifUsd = financials.cifUsd;
      taxesFeesUsd = financials.taxesFeesUsd;
      landedDdpUsd = financials.landedDdpUsd;
      resolvedLinesForCreate = resolvedLines.map((l) => ({
        projectId: l.projectId,
        quoteId: l.quoteId,
        containerSharePct: l.containerSharePct,
        sortOrder: l.sortOrder,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid multi-project sale";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } else {
    const [project, quoteRow] = await Promise.all([
      prisma.project.findFirst({ where: { id: data.projectId!, organizationId }, select: { id: true } }),
      data.quoteId
        ? prisma.quote.findFirst({ where: { id: data.quoteId, organizationId }, select: { id: true } })
        : Promise.resolve(null),
    ]);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 400 });
    if (data.quoteId && !quoteRow) return NextResponse.json({ error: "Quote not found" }, { status: 400 });
    primaryProjectId = data.projectId!;
    headerQuoteId = data.quoteId ?? null;
    exwUsd = data.exwUsd!;
    commissionPct = data.commissionPct!;
    commissionAmountUsd = data.commissionAmountUsd!;
    fobUsd = data.fobUsd!;
    freightUsd = data.freightUsd!;
    cifUsd = data.cifUsd!;
    taxesFeesUsd = data.taxesFeesUsd!;
    landedDdpUsd = data.landedDdpUsd!;
    resolvedLinesForCreate = [
      {
        projectId: primaryProjectId,
        quoteId: headerQuoteId,
        containerSharePct: null,
        sortOrder: 0,
      },
    ];
  }

  await ensureBillingEntities(organizationId);

  const invoiceLines = data.invoices ?? [];
  for (const inv of invoiceLines) {
    const ent = await prisma.billingEntity.findFirst({
      where: { id: inv.entityId, organizationId, isActive: true },
    });
    if (!ent) return NextResponse.json({ error: "Invalid billing entity" }, { status: 400 });
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const saleNumber = await nextSaleNumber(tx, organizationId);
      const statusEnum = data.status === "CONFIRMED" ? SaleOrderStatus.CONFIRMED : SaleOrderStatus.DRAFT;
      const created = await tx.sale.create({
        data: {
          organizationId,
          clientId: data.clientId,
          projectId: primaryProjectId,
          quoteId: headerQuoteId,
          saleNumber,
          quantity: data.quantity,
          status: statusEnum,
          exwUsd,
          commissionPct,
          commissionAmountUsd,
          fobUsd,
          freightUsd,
          cifUsd,
          taxesFeesUsd,
          landedDdpUsd,
          invoicedBasis: data.invoicedBasis ?? "DDP",
          notes: data.notes ?? null,
          createdByUserId: user.id ?? null,
          saleProjectLines: {
            create: resolvedLinesForCreate.map((l) => ({
              projectId: l.projectId,
              quoteId: l.quoteId,
              containerSharePct: l.containerSharePct,
              sortOrder: l.sortOrder,
            })),
          },
          invoices:
            invoiceLines.length > 0
              ? {
                  create: invoiceLines.map((inv) => ({
                    billingEntityId: inv.entityId,
                    amountUsd: inv.amountUsd,
                    dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
                    sequence: inv.sequence ?? 1,
                    referenceNumber: inv.referenceNumber ?? null,
                    notes: inv.notes ?? null,
                  })),
                }
              : undefined,
        },
      });
      return created;
    });

    await refreshSaleComputedStatus(sale.id);

    if (data.status === "CONFIRMED") {
      const projectIds = [...new Set(resolvedLinesForCreate.map((l) => l.projectId))];
      await prisma.project.updateMany({
        where: { id: { in: projectIds }, organizationId, status: { not: "lost" } },
        data: { status: "won" },
      });
    }

    return NextResponse.json({ id: sale.id });
  } catch (e) {
    console.error("[POST /api/sales]", e);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
