import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { rowsToCsv } from "@/lib/csv-export";

async function getHandler(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx?.isPlatformSuperadmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from")?.trim();
  const toStr = url.searchParams.get("to")?.trim();
  const from = fromStr ? new Date(fromStr) : null;
  const to = toStr ? new Date(toStr) : null;
  if (from && Number.isNaN(from.getTime())) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  if (to && Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }

  const where =
    from || to
      ? {
          createdAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {};

  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      action: true,
      entityType: true,
      entityId: true,
      organizationId: true,
      createdAt: true,
      metadataJson: true,
      user: { select: { fullName: true, email: true } },
    },
  });

  const headers = [
    "createdAt",
    "action",
    "entityType",
    "entityId",
    "organizationId",
    "userName",
    "userEmail",
    "metadataJson",
  ];
  const dataRows = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.action,
      r.entityType,
      r.entityId,
      r.organizationId ?? "",
      r.user?.fullName ?? "",
      r.user?.email ?? "",
      r.metadataJson != null ? JSON.stringify(r.metadataJson) : "",
    ].map(String)
  );
  const csv = rowsToCsv(headers, dataRows);
  const filename = `activity-export-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export const GET = withSaaSHandler({}, getHandler);
