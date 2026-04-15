/**
 * Create a quote from the multi-step wizard (CSV Revit import or m² by system).
 * Uses `buildQuoteSnapshot` for wall/material math; persists money via `canonicalizeSaaSQuotePayload` + `createQuote`.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { ApiHttpError } from "@/lib/api-error";
import { generateQuoteNumber } from "@/lib/utils";
import { createActivityLog } from "@/lib/audit";
import {
  buildQuoteSnapshot,
  canonicalizeSaaSQuotePayload,
  catalogPiecesToPieceMetaMap,
  createQuote,
  getRawRatesFromConfig,
  projectHasCompletedEngineering,
  assertEngineeringRequestForQuote,
  resolveTaxRulesForSaaSQuote,
  resolvePartnerPricingConfig,
  resolveSaaSQuotePricingForCreate,
  formatQuoteForSaaSApiWithSnapshot,
} from "@vbt/core";
import type { Prisma } from "@vbt/db";
import type { CreateQuoteItemInput } from "@vbt/core";
import type { PieceMeta, QuoteInputLine } from "@vbt/core/quote-engine";

const wizardBodySchema = z
  .object({
    projectId: z.string().min(1),
    costMethod: z.enum(["CSV", "M2_BY_SYSTEM"]),
    baseUom: z.enum(["M", "FT"]).default("M"),
    revitImportId: z.string().optional().nullable(),
    warehouseId: z.string().optional().nullable(),
    reserveStock: z.boolean().optional().default(false),
    m2S80: z.number().min(0).default(0),
    m2S150: z.number().min(0).default(0),
    m2S200: z.number().min(0).default(0),
    m2Total: z.number().min(0).default(0),
    commissionPct: z.number().min(0).default(0),
    commissionFixed: z.number().min(0).default(0),
    commissionFixedPerKit: z.number().min(0).optional().default(0),
    freightCostUsd: z.number().min(0).default(0),
    freightProfileId: z.string().optional().nullable(),
    numContainers: z.number().int().min(1).default(1),
    kitsPerContainer: z.number().int().min(0).default(0),
    totalKits: z.number().int().min(0).default(0),
    countryId: z.string().optional().nullable(),
    taxRuleSetId: z.string().optional().nullable(),
    notes: z.string().max(32000).optional().nullable(),
    engineeringRequestId: z.string().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.costMethod === "CSV" && !data.revitImportId?.trim()) {
      ctx.addIssue({ code: "custom", message: "revitImportId is required for CSV method", path: ["revitImportId"] });
    }
  });

function snapshotLinesToItems(
  lines: Array<{
    description: string;
    pieceId?: string | null;
    qty: number;
    lineTotal: number;
    isIgnored: boolean;
  }>
): CreateQuoteItemInput[] {
  const out: CreateQuoteItemInput[] = [];
  let i = 0;
  for (const line of lines) {
    if (line.isIgnored) continue;
    const qty = Math.max(0, Number(line.qty) || 0);
    const lineTotal = Math.max(0, Number(line.lineTotal) || 0);
    if (qty <= 0 || lineTotal <= 0) continue;
    const unitCost = lineTotal / qty;
    out.push({
      itemType: "product",
      sku: null,
      description: line.description,
      unit: "unit",
      quantity: qty,
      unitCost,
      markupPct: 0,
      unitPrice: unitCost,
      totalPrice: lineTotal,
      sortOrder: i++,
      catalogPieceId: line.pieceId ?? null,
    });
  }
  return out;
}

async function postHandler(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new ApiHttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  const organizationId = ctx.activeOrgId;
  if (!organizationId) {
    throw new ApiHttpError(
      400,
      "NO_ACTIVE_ORG",
      "No active organization. Select an organization before creating a quote."
    );
  }
  const body = await req.json();
  const parsed = wizardBodySchema.safeParse(body);
  if (!parsed.success) throw parsed.error;

  const data = parsed.data;
  const tenantCtx = {
    userId: ctx.userId,
    organizationId,
    isPlatformSuperadmin: ctx.isPlatformSuperadmin,
  };

  const projectOrg = await prisma.project.findUnique({
    where: { id: data.projectId },
    select: { organizationId: true, countryCode: true },
  });
  if (!projectOrg || projectOrg.organizationId !== organizationId) {
    throw new ApiHttpError(400, "PROJECT_ORG_MISMATCH", "Project not found for this organization.");
  }

  const partnerProfile = await prisma.partnerProfile.findUnique({
    where: { organizationId },
    select: { requireDeliveredEngineeringForQuotes: true },
  });
  if (partnerProfile?.requireDeliveredEngineeringForQuotes) {
    const ok = await projectHasCompletedEngineering(prisma, organizationId, data.projectId);
    if (!ok) {
      throw new ApiHttpError(
        400,
        "ENGINEERING_NOT_DELIVERED",
        "This partner requires at least one completed engineering request for the project before creating quotes."
      );
    }
  }

  try {
    await assertEngineeringRequestForQuote(
      prisma,
      organizationId,
      data.projectId,
      data.engineeringRequestId ?? null
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid engineering request";
    throw new ApiHttpError(400, "ENGINEERING_REQUEST_INVALID", msg);
  }

  const taxRules = await resolveTaxRulesForSaaSQuote(prisma, {
    organizationId,
    projectCountryCode: projectOrg.countryCode,
  });

  const raw = await getRawRatesFromConfig(prisma);
  const orgDefaults = {
    baseUom: data.baseUom,
    minRunFt: raw.minRunFt,
    rateS80: raw.rateS80,
    rateS150: raw.rateS150,
    rateS200: raw.rateS200,
    rateGlobal: raw.rateGlobal,
  };

  let lines: QuoteInputLine[] | undefined;
  let pieceMeta: Record<string, PieceMeta> = {};

  if (data.costMethod === "CSV" && data.revitImportId) {
    const imp = await prisma.revitImport.findFirst({
      where: { id: data.revitImportId, organizationId },
      include: {
        lines: { orderBy: { rowNum: "asc" } },
      },
    });
    if (!imp) {
      throw new ApiHttpError(404, "IMPORT_NOT_FOUND", "CSV import not found.");
    }
    const pieceIds = [
      ...new Set(imp.lines.map((l) => l.catalogPieceId).filter((x): x is string => Boolean(x))),
    ];
    const pieces = pieceIds.length
      ? await prisma.catalogPiece.findMany({
          where: { id: { in: pieceIds }, isActive: true },
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
        })
      : [];
    pieceMeta = catalogPiecesToPieceMetaMap(pieces);

    lines = imp.lines
      .filter((l) => !l.isIgnored && l.catalogPieceId)
      .map((l) => ({
        description: l.rawPieceName,
        pieceId: l.catalogPieceId ?? undefined,
        qty: l.rawQty,
        heightMm: l.rawHeightMm,
        isIgnored: false,
      }));
  }

  /** VL % is applied again in SaaS layers; keep snapshot FOB = factory + freight path only (commissionPct 0 here). */
  const snapshot = buildQuoteSnapshot({
    method: data.costMethod,
    baseUom: data.baseUom,
    lines,
    pieceMeta,
    m2S80: data.m2S80,
    m2S150: data.m2S150,
    m2S200: data.m2S200,
    m2Total: data.m2Total,
    orgDefaults,
    commissionPct: 0,
    commissionFixed: 0,
    commissionFixedPerKit: 0,
    freightCostUsd: data.freightCostUsd,
    numContainers: data.numContainers,
    kitsPerContainer: data.kitsPerContainer,
    totalKits: data.totalKits,
    taxRules,
  });

  const items =
    data.costMethod === "CSV" ? snapshotLinesToItems(snapshot.lines) : [];

  if (data.costMethod === "CSV" && items.length === 0) {
    throw new ApiHttpError(
      400,
      "WIZARD_CSV_NO_LINES",
      "No priced lines from CSV import. Map or ignore all rows, then try again."
    );
  }

  const resolved = await resolvePartnerPricingConfig(prisma, {
    organizationId,
    projectCountryCode: projectOrg.countryCode,
  });

  const pricingInputs = resolveSaaSQuotePricingForCreate({
    isSuperadmin: !!ctx.isPlatformSuperadmin,
    explicit: {
      visionLatamMarkupPct:
        ctx.isPlatformSuperadmin && data.commissionPct > 0 ? data.commissionPct : undefined,
      logisticsCost: data.freightCostUsd,
      importCost: undefined,
      localTransportCost: undefined,
      technicalServiceCost:
        data.commissionFixed > 0 || (data.commissionFixedPerKit ?? 0) > 0
          ? data.commissionFixed + (data.commissionFixedPerKit ?? 0) * Math.max(1, data.totalKits)
          : undefined,
    },
    resolved,
  });

  const hasLines = items.length > 0;
  const canon = canonicalizeSaaSQuotePayload({
    items: hasLines ? items : [],
    headerFactoryExwUsd: hasLines ? undefined : snapshot.factoryCostUsd,
    visionLatamMarkupPct: pricingInputs.visionLatamMarkupPct,
    partnerMarkupPct: pricingInputs.partnerMarkupPct,
    logisticsCostUsd: pricingInputs.logisticsCostUsd,
    localTransportCostUsd: pricingInputs.localTransportCostUsd,
    importCostUsd: pricingInputs.importCostUsd,
    technicalServiceUsd: pricingInputs.technicalServiceUsd,
    taxRules,
  });

  const quoteNumber = generateQuoteNumber();

  const quote = await createQuote(prisma, tenantCtx, {
    projectId: data.projectId,
    quoteNumber,
    visionLatamMarkupPct: canon.visionLatamMarkupPct,
    partnerMarkupPct: canon.partnerMarkupPct,
    logisticsCost: canon.logisticsCostUsd,
    importCost: canon.importCostUsd,
    localTransportCost: canon.localTransportCostUsd,
    technicalServiceCost: canon.technicalServiceUsd,
    factoryCostTotal: canon.factoryCostTotal,
    totalPrice: canon.totalPrice,
    items: canon.items,
    engineeringRequestId: data.engineeringRequestId ?? null,
    taxRulesSnapshotJson: taxRules as unknown as Prisma.InputJsonValue,
    notes: data.notes ?? null,
    revitImportId: data.revitImportId?.trim() || null,
    quoteCostMethod: data.costMethod,
    wallAreaM2S80: snapshot.wallAreaM2S80,
    wallAreaM2S150: snapshot.wallAreaM2S150,
    wallAreaM2S200: snapshot.wallAreaM2S200,
    wallAreaM2Total: snapshot.wallAreaM2Total,
    totalKits: snapshot.totalKits,
    numContainers: snapshot.numContainers,
    kitsPerContainer: snapshot.kitsPerContainer,
    totalWeightKg: snapshot.totalWeightKgCored,
    totalVolumeM3: snapshot.totalVolumeM3,
    concreteM3: snapshot.concreteM3,
    steelKgEst: snapshot.steelKgEst,
  });

  await createActivityLog({
    organizationId,
    userId: ctx.userId,
    action: "quote_created",
    entityType: "quote",
    entityId: quote.id,
    metadata: { quoteNumber, projectId: data.projectId, source: "wizard" },
  });

  return NextResponse.json(
    formatQuoteForSaaSApiWithSnapshot(quote, { maskFactoryExw: !ctx.isPlatformSuperadmin }),
    { status: 201 }
  );
}

export const POST = withSaaSHandler({ module: "quotes", rateLimitTier: "create_update" }, postHandler);
