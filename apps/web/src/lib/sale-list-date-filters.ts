const PLAIN_YMD = /^\d{4}-\d{2}-\d{2}$/;

function isPlainYmd(s: string): boolean {
  return PLAIN_YMD.test(s.trim());
}

/** Parses sale list `from` / export filter; returns null if invalid (avoids Prisma errors on bad query strings). */
export function parseSaleListDateStart(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const raw = isPlainYmd(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses sale list `to` / export filter (end of local calendar day when value is YYYY-MM-DD). */
export function parseSaleListDateEnd(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const raw = isPlainYmd(trimmed) ? `${trimmed}T23:59:59.999Z` : trimmed;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
