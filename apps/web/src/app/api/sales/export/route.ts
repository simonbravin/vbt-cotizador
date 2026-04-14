import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { salesListWhere } from "@/lib/sales-access";
import { SaleOrderStatus } from "@vbt/db";
import type { Prisma } from "@vbt/db";
import { getInvoicedAmount } from "@/lib/sales";
import { saleProjectLinesSummary } from "@/lib/partner-sales";
import { parseSaleListDateEnd, parseSaleListDateStart } from "@/lib/sale-list-date-filters";

function esc(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

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

async function salesExportGetHandler(req: Request) {
  const user = (await requireSession()) as SessionUser;

  const url = new URL(req.url);
  const baseWhere = await salesListWhere(user, url);
  const status = parseStatus(url.searchParams.get("status"));
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

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
  if (projectId) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { OR: [{ projectId }, { saleProjectLines: { some: { projectId } } }] },
    ];
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      client: { select: { name: true } },
      project: { select: { projectName: true } },
      saleProjectLines: {
        orderBy: { sortOrder: "asc" },
        include: { project: { select: { id: true, projectName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header = "sale_number,status,client,project,qty,basis_amount_usd,created_at";
  const lines = [header];
  for (const s of sales) {
    const basis = getInvoicedAmount(s);
    lines.push(
      [
        esc(s.saleNumber ?? s.id.slice(0, 8)),
        s.status,
        esc(s.client.name),
        esc(saleProjectLinesSummary(s.saleProjectLines ?? [], s.project.projectName)),
        String(s.quantity),
        basis.toFixed(2),
        s.createdAt.toISOString(),
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-export.csv"`,
    },
  });
}

export const GET = withSaaSHandler({ module: "sales", rateLimitTier: "read" }, salesExportGetHandler);
