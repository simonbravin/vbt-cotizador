import type { PrismaClient } from "@vbt/db";
import { getCountryByCode } from "./countries";

/**
 * Returns the list of country codes allowed for a given organization (partner).
 * Combines Organization.countryCode (if set) and all PartnerTerritory.countryCode for that org.
 * Used to filter country dropdowns for clients and projects when the user is a partner.
 */
export async function getAllowedCountryCodes(
  prisma: PrismaClient,
  organizationId: string
): Promise<string[]> {
  const [org, territories] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { countryCode: true },
    }),
    prisma.partnerTerritory.findMany({
      where: { organizationId },
      select: { countryCode: true },
    }),
  ]);
  const codes = new Set<string>();
  if (org?.countryCode?.trim()) codes.add(org.countryCode.trim().toUpperCase());
  for (const t of territories) {
    if (t.countryCode?.trim()) codes.add(t.countryCode.trim().toUpperCase());
  }
  return Array.from(codes);
}

export type PartnerCountryOption = { id: string; name: string; code: string };

/**
 * Options for partner-scoped country selects (clients, projects, `/api/countries`).
 * Loads `Country` rows when present; for allowed ISO codes missing from the catalog
 * (common when the org has `countryCode` but superadmin never created the `Country` row),
 * falls back to static labels so the dropdown is usable.
 */
export async function getPartnerCountryDropdownOptions(
  prisma: PrismaClient,
  organizationId: string
): Promise<PartnerCountryOption[]> {
  const allowedCodes = await getAllowedCountryCodes(prisma, organizationId);
  if (allowedCodes.length === 0) return [];

  const rows = await prisma.country.findMany({
    where: { code: { in: allowedCodes } },
  });
  const rowByUpper = new Map(rows.map((r) => [r.code.toUpperCase(), r]));

  const options: PartnerCountryOption[] = [];
  for (const raw of allowedCodes) {
    const upper = raw.toUpperCase();
    const row = rowByUpper.get(upper);
    if (row) {
      options.push({ id: row.id, name: row.name, code: row.code });
    } else {
      const stat = getCountryByCode(upper);
      const code = stat?.code ?? upper;
      const name = stat?.name ?? upper;
      options.push({ id: code, name, code });
    }
  }

  options.sort((a, b) => a.name.localeCompare(b.name));
  return options;
}
