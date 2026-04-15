import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@vbt/db";
import { prisma } from "@/lib/db";
import { getTenantContext, TenantError, tenantErrorStatus } from "@/lib/tenant";
import { computeLineMetrics, catalogPiecesToPieceMetaMap } from "@vbt/core";

const mapSchema = z
  .object({
    lineId: z.string().min(1),
    pieceId: z.string().optional().default(""),
    ignore: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.ignore && (!data.pieceId || !data.pieceId.trim())) {
      ctx.addIssue({
        code: "custom",
        message: "pieceId is required unless ignore is true",
        path: ["pieceId"],
      });
    }
  });

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function importIdFromCtx(routeContext: unknown): Promise<string> {
  const p = (routeContext as RouteCtx).params;
  return (p instanceof Promise ? await p : p).id;
}

export async function POST(req: Request, routeContext: unknown) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = ctx.activeOrgId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization. Select an organization.", code: "NO_ACTIVE_ORG" },
        { status: 400 }
      );
    }
    const importId = await importIdFromCtx(routeContext);

    const parent = await prisma.revitImport.findFirst({
      where: { id: importId, organizationId },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = mapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
    }

    const { lineId, pieceId, ignore } = parsed.data;

    const line = await prisma.revitImportLine.findFirst({
      where: { id: lineId, importId },
    });
    if (!line) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    if (ignore) {
      await prisma.revitImportLine.update({
        where: { id: lineId },
        data: { isIgnored: true, matchMethod: "IGNORED", catalogPieceId: null },
      });
    } else {
      const piece = await prisma.catalogPiece.findFirst({
        where: { id: pieceId, isActive: true },
        select: {
          id: true,
          canonicalName: true,
          systemCode: true,
          dieNumber: true,
          usefulWidthMm: true,
          lbsPerMCored: true,
          kgPerMCored: true,
          pricePerM2Cored: true,
        },
      });
      if (!piece) {
        return NextResponse.json({ error: "Catalog piece not found" }, { status: 404 });
      }

      const metaMap = catalogPiecesToPieceMetaMap([piece]);
      const meta = metaMap[piece.id];

      const data: Prisma.RevitImportLineUncheckedUpdateInput = {
        catalogPieceId: pieceId,
        matchMethod: "MANUAL",
        isIgnored: false,
      };

      if (line.rawQty > 0 && line.rawHeightMm > 0 && meta) {
        const metrics = computeLineMetrics({
          qty: line.rawQty,
          heightMm: line.rawHeightMm,
          usefulWidthM: meta.usefulWidthM ?? 0,
          lbsPerMCored: meta.lbsPerMCored ?? 0,
          lbsPerMUncored: meta.lbsPerMUncored ?? 0,
          volumePerM: meta.volumePerM ?? 0,
        });
        Object.assign(data, {
          linearM: metrics.linearM,
          linearFt: metrics.linearFt,
          m2Line: metrics.m2Line,
          weightLbsCored: metrics.weightLbsCored,
          weightLbsUncored: metrics.weightLbsUncored,
          weightKgCored: metrics.weightKgCored,
          weightKgUncored: metrics.weightKgUncored,
          volumeM3: metrics.volumeM3,
        });
        const cost = meta.cost;
        if (cost?.pricePerMCored && cost.pricePerMCored > 0) {
          data.pricePerM = cost.pricePerMCored;
          data.pricePerFt = cost.pricePerMCored * 0.3048;
        }
      }

      await prisma.revitImportLine.update({
        where: { id: lineId },
        data,
      });
    }

    const importLines = await prisma.revitImportLine.findMany({
      where: { importId },
    });
    const matchedCount = importLines.filter((l) => l.catalogPieceId && !l.isIgnored).length;
    const unmappedCount = importLines.filter((l) => !l.catalogPieceId && !l.isIgnored).length;

    await prisma.revitImport.update({
      where: { id: importId },
      data: {
        matchedCount,
        unmappedCount,
        status: unmappedCount === 0 ? "MAPPED" : "PENDING",
      },
    });

    return NextResponse.json({ success: true, matchedCount, unmappedCount });
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: tenantErrorStatus(e) });
    }
    console.error("[api/import/[id]/map POST]", e);
    return NextResponse.json({ error: "Failed to update import line" }, { status: 500 });
  }
}
