import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext, TenantError, tenantErrorStatus } from "@/lib/tenant";
import {
  parseRevitCsv,
  computeLineMetrics,
  catalogPiecesToPieceLookup,
  buildCatalogCodeIndex,
  matchCatalogPieceRow,
  catalogPiecesToPieceMetaMap,
} from "@vbt/core";

export async function POST(req: Request) {
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
    const userId = ctx.userId;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = (formData.get("projectId") as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (projectId) {
      const proj = await prisma.project.findFirst({
        where: { id: projectId, organizationId },
        select: { id: true },
      });
      if (!proj) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const csvText = await file.text();
    const parsed = parseRevitCsv(csvText);

    const catalogRows = await prisma.catalogPiece.findMany({
      where: { isActive: true },
      select: {
        id: true,
        canonicalName: true,
        dieNumber: true,
        systemCode: true,
        usefulWidthMm: true,
        lbsPerMCored: true,
        kgPerMCored: true,
        pricePerM2Cored: true,
      },
    });

    const lookups = catalogPiecesToPieceLookup(catalogRows);
    const codeIndex = buildCatalogCodeIndex(catalogRows, lookups);
    const pieceMeta = catalogPiecesToPieceMetaMap(catalogRows);

    const revitImport = await prisma.revitImport.create({
      data: {
        organizationId,
        projectId: projectId ?? undefined,
        filename: file.name,
        uploadedByUserId: userId,
        rowCount: parsed.totalRows,
        status: "PENDING",
      },
    });

    let matchedCount = 0;
    let unmappedCount = 0;
    const lineData: {
      importId: string;
      rowNum: number;
      rawPieceCode: string | null;
      rawPieceName: string;
      rawQty: number;
      rawHeightMm: number;
      catalogPieceId: string | null;
      matchMethod: string | null;
      linearM: number | null;
      linearFt: number | null;
      m2Line: number | null;
      weightLbsCored: number | null;
      weightLbsUncored: number | null;
      weightKgCored: number | null;
      weightKgUncored: number | null;
      volumeM3: number | null;
      pricePerM: number | null;
      pricePerFt: number | null;
    }[] = [];

    for (const row of parsed.rows) {
      const match = matchCatalogPieceRow(
        { rawPieceCode: row.rawPieceCode, normalizedName: row.normalizedName },
        lookups,
        codeIndex
      );

      const isMatched = match.pieceId !== null;
      if (isMatched) matchedCount++;
      else unmappedCount++;

      const piece = isMatched ? catalogRows.find((p) => p.id === match.pieceId) : null;
      const meta = piece?.id ? pieceMeta[piece.id] : undefined;

      let linearM: number | null = null;
      let linearFt: number | null = null;
      let m2Line: number | null = null;
      let weightLbsCored: number | null = null;
      let weightLbsUncored: number | null = null;
      let weightKgCored: number | null = null;
      let weightKgUncored: number | null = null;
      let volumeM3: number | null = null;
      let pricePerM: number | null = null;
      let pricePerFt: number | null = null;

      if (!row.parseError && row.rawQty > 0 && row.rawHeightMm > 0 && meta) {
        const metrics = computeLineMetrics({
          qty: row.rawQty,
          heightMm: row.rawHeightMm,
          usefulWidthM: meta.usefulWidthM ?? 0,
          lbsPerMCored: meta.lbsPerMCored ?? 0,
          lbsPerMUncored: meta.lbsPerMUncored ?? 0,
          volumePerM: meta.volumePerM ?? 0,
        });
        linearM = metrics.linearM;
        linearFt = metrics.linearFt;
        m2Line = metrics.m2Line;
        weightLbsCored = metrics.weightLbsCored;
        weightLbsUncored = metrics.weightLbsUncored;
        weightKgCored = metrics.weightKgCored;
        weightKgUncored = metrics.weightKgUncored;
        volumeM3 = metrics.volumeM3;

        const cost = meta.cost;
        if (cost?.pricePerMCored && cost.pricePerMCored > 0) {
          pricePerM = cost.pricePerMCored;
          pricePerFt = cost.pricePerMCored * 0.3048;
        }
      }

      lineData.push({
        importId: revitImport.id,
        rowNum: row.rowNum,
        rawPieceCode: row.rawPieceCode ?? null,
        rawPieceName: row.rawPieceName,
        rawQty: row.rawQty,
        rawHeightMm: row.rawHeightMm,
        catalogPieceId: match.pieceId,
        matchMethod: match.pieceId ? match.matchMethod : null,
        linearM,
        linearFt,
        m2Line,
        weightLbsCored,
        weightLbsUncored,
        weightKgCored,
        weightKgUncored,
        volumeM3,
        pricePerM,
        pricePerFt,
      });
    }

    if (lineData.length > 0) {
      await prisma.revitImportLine.createMany({ data: lineData });
    }

    await prisma.revitImport.update({
      where: { id: revitImport.id },
      data: {
        matchedCount,
        unmappedCount,
        status: unmappedCount === 0 ? "MAPPED" : "PENDING",
      },
    });

    const insertedLines = await prisma.revitImportLine.findMany({
      where: { importId: revitImport.id },
      orderBy: { rowNum: "asc" },
      select: {
        id: true,
        rowNum: true,
        rawPieceCode: true,
        rawPieceName: true,
        rawQty: true,
        m2Line: true,
        catalogPieceId: true,
      },
    });

    const unmatchedRows = insertedLines
      .filter((l) => !l.catalogPieceId)
      .map((l) => ({
        lineId: l.id,
        rowIndex: l.rowNum,
        revitFamily: l.rawPieceCode ?? "",
        revitType: l.rawPieceName,
        quantity: l.rawQty,
        area: l.m2Line ?? 0,
        mappedCatalogId: null as string | null,
        ignored: false,
      }));

    return NextResponse.json(
      {
        revitImportId: revitImport.id,
        totalRows: parsed.totalRows,
        matchedCount,
        unmatchedRows,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: tenantErrorStatus(e) });
    }
    console.error("[api/import/csv POST]", e);
    return NextResponse.json({ error: "Failed to parse CSV" }, { status: 500 });
  }
}
