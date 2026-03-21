/**
 * Single resolution path for SaaS quote taxes: Project.countryCode → Country → TaxRuleSet (partner override, else platform base).
 */

import { z } from "zod";
import type { PrismaClient } from "@vbt/db";
import type { TaxBase, TaxRule } from "../calculations";

const taxBaseSchema: z.ZodType<TaxBase> = z.enum([
  "CIF",
  "FOB",
  "BASE_IMPONIBLE",
  "FIXED_PER_CONTAINER",
  "FIXED_TOTAL",
]);

const taxRuleSchema: z.ZodType<TaxRule> = z.object({
  order: z.number(),
  label: z.string(),
  base: taxBaseSchema,
  ratePct: z.number().optional(),
  fixedAmount: z.number().optional(),
  perContainer: z.boolean().optional(),
  note: z.string().optional(),
});

const taxRulesArraySchema = z.array(taxRuleSchema);

export class QuoteTaxResolutionError extends Error {
  readonly code: "PROJECT_COUNTRY_REQUIRED" | "COUNTRY_NOT_FOUND" | "NO_TAX_RULE_SET";

  constructor(
    code: QuoteTaxResolutionError["code"],
    message: string
  ) {
    super(message);
    this.name = "QuoteTaxResolutionError";
    this.code = code;
  }
}

/** Parse `rules_json` / snapshot column into engine rules (strict shape). */
export function parseTaxRulesJson(raw: unknown): TaxRule[] {
  const parsed = taxRulesArraySchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }
  return parsed.data;
}

export function parseTaxRulesSnapshotFromQuoteRow(quote: { taxRulesSnapshotJson?: unknown }): TaxRule[] | undefined {
  if (quote.taxRulesSnapshotJson == null) return undefined;
  const parsed = taxRulesArraySchema.safeParse(quote.taxRulesSnapshotJson);
  if (!parsed.success) return undefined;
  return parsed.data;
}

/** True if JSON is a valid `TaxRule[]` (including `[]`). */
export function isTaxRulesSnapshotJsonValid(raw: unknown): boolean {
  if (raw == null) return false;
  return taxRulesArraySchema.safeParse(raw).success;
}

export class QuoteMissingTaxSnapshotError extends Error {
  readonly code: "MISSING_TAX_RULES_SNAPSHOT" | "INVALID_TAX_RULES_SNAPSHOT";
  readonly quoteId?: string;

  constructor(
    code: QuoteMissingTaxSnapshotError["code"],
    message: string,
    quoteId?: string
  ) {
    super(message);
    this.name = "QuoteMissingTaxSnapshotError";
    this.code = code;
    this.quoteId = quoteId;
  }
}

/**
 * Read path after backfill: snapshot must exist and parse as `TaxRule[]`. No runtime resolution from TaxRuleSet.
 */
export function requireTaxRulesSnapshotFromQuote(quote: {
  id?: string;
  taxRulesSnapshotJson?: unknown;
}): TaxRule[] {
  if (quote.taxRulesSnapshotJson == null) {
    throw new QuoteMissingTaxSnapshotError(
      "MISSING_TAX_RULES_SNAPSHOT",
      "La cotización no tiene tax_rules_snapshot_json. Ejecutá el backfill (`pnpm --filter @vbt/db run backfill:quote-tax-snapshots backfill`) o guardá de nuevo la cotización.",
      quote.id
    );
  }
  const parsed = taxRulesArraySchema.safeParse(quote.taxRulesSnapshotJson);
  if (!parsed.success) {
    throw new QuoteMissingTaxSnapshotError(
      "INVALID_TAX_RULES_SNAPSHOT",
      "tax_rules_snapshot_json no es un arreglo de reglas fiscales válido. Corregí datos o re-ejecutá el backfill con INCLUDE_INVALID_SNAPSHOT=1.",
      quote.id
    );
  }
  return parsed.data;
}

export async function resolveTaxRulesForSaaSQuote(
  prisma: PrismaClient,
  params: { organizationId: string; projectCountryCode: string | null | undefined }
): Promise<TaxRule[]> {
  const code = params.projectCountryCode?.trim().toUpperCase();
  if (!code) {
    throw new QuoteTaxResolutionError(
      "PROJECT_COUNTRY_REQUIRED",
      "El proyecto debe tener countryCode para resolver impuestos de la cotización."
    );
  }

  const country = await prisma.country.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!country) {
    throw new QuoteTaxResolutionError(
      "COUNTRY_NOT_FOUND",
      `No existe país con código ISO "${code}" en la plataforma.`
    );
  }

  const partnerSet = await prisma.taxRuleSet.findFirst({
    where: { organizationId: params.organizationId, countryId: country.id },
    orderBy: { updatedAt: "desc" },
    select: { rulesJson: true },
  });
  const baseSet =
    partnerSet ??
    (await prisma.taxRuleSet.findFirst({
      where: { organizationId: null, countryId: country.id },
      orderBy: { updatedAt: "desc" },
      select: { rulesJson: true },
    }));

  if (!baseSet) {
    throw new QuoteTaxResolutionError(
      "NO_TAX_RULE_SET",
      `No hay conjunto de reglas fiscales para el país ${code}. Configúralo en superadmin (impuestos por país).`
    );
  }

  return parseTaxRulesJson(baseSet.rulesJson);
}

