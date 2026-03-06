import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function escapeCsv(s: string | number | null | undefined): string {
  if (s == null) return "";
  const str = String(s);
  if (/[,"\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { orgId: string };

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "";
  const entityId = url.searchParams.get("entityId") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const format = url.searchParams.get("format") ?? "csv";

  const where: Record<string, unknown> = { orgId: user.orgId };
  if (clientId) (where as any).clientId = clientId;
  if (from || to) {
    (where as any).createdAt = {};
    if (from) (where as any).createdAt.gte = new Date(from);
    if (to) {
      const d = new Date(to);
      d.setHours(23, 59, 59, 999);
      (where as any).createdAt.lte = d;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      client: { select: { name: true } },
      project: { select: { name: true } },
      invoices: { include: { entity: { select: { name: true } } } },
      payments: { include: { entity: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  let filtered = sales;
  if (entityId) {
    filtered = sales.filter(
      (s) =>
        s.invoices.some((i) => i.entityId === entityId) ||
        s.payments.some((p) => p.entityId === entityId)
    );
  }

  if (format === "csv") {
    const rows: string[][] = [
      ["Client", "Project", "Sale #", "Date", "Entity", "Invoiced", "Paid", "Balance"],
    ];
    for (const sale of filtered) {
      const entities = new Set<string>();
      sale.invoices.forEach((i) => entities.add(i.entity.name));
      sale.payments.forEach((p) => entities.add(p.entity.name));
      const invByEntity: Record<string, number> = {};
      const payByEntity: Record<string, number> = {};
      for (const i of sale.invoices) {
        if (entityId && i.entityId !== entityId) continue;
        invByEntity[i.entity.name] = (invByEntity[i.entity.name] ?? 0) + i.amountUsd;
      }
      for (const p of sale.payments) {
        if (entityId && p.entityId !== entityId) continue;
        payByEntity[p.entity.name] = (payByEntity[p.entity.name] ?? 0) + p.amountUsd;
      }
      const dateStr = sale.createdAt.toISOString().slice(0, 10);
      if (entities.size === 0) {
        rows.push([
          sale.client.name,
          sale.project.name,
          sale.saleNumber ?? "",
          dateStr,
          "",
          "0",
          "0",
          "0",
        ]);
      } else {
        for (const en of entities) {
          const inv = invByEntity[en] ?? 0;
          const pay = payByEntity[en] ?? 0;
          rows.push([
            sale.client.name,
            sale.project.name,
            sale.saleNumber ?? "",
            dateStr,
            en,
            String(inv),
            String(pay),
            String(inv - pay),
          ]);
        }
      }
    }
    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
    const filename = `sales-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
