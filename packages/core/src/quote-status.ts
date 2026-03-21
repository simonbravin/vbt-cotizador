import type { QuoteStatus } from "@vbt/db";

/** Prisma `QuoteStatus` — single source of truth for persisted quotes. */
export const CANONICAL_QUOTE_STATUSES: readonly QuoteStatus[] = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "archived",
] as const;

const LOWER_MAP: Record<string, QuoteStatus> = {
  draft: "draft",
  sent: "sent",
  accepted: "accepted",
  rejected: "rejected",
  expired: "expired",
  archived: "archived",
};

/**
 * Map UI / legacy API strings to Prisma `QuoteStatus`.
 * `ARCHIVED` / `CANCELLED` (legacy labels) → `archived` (withdrawn / hidden from active pipeline).
 */
export function normalizeQuoteStatus(input: unknown): QuoteStatus | null {
  if (input == null || typeof input !== "string") return null;
  const t = input.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (LOWER_MAP[lower]) return LOWER_MAP[lower];
  const upper = t.toUpperCase();
  if (upper === "DRAFT") return "draft";
  if (upper === "SENT") return "sent";
  if (upper === "ACCEPTED") return "accepted";
  if (upper === "REJECTED") return "rejected";
  if (upper === "EXPIRED") return "expired";
  if (upper === "ARCHIVED") return "archived";
  if (upper === "CANCELLED") return "archived";
  return null;
}

/** True if the raw value is a legacy archive/cancel label (e.g. UI constant `ARCHIVED`), not the canonical enum `archived`. */
export function isLegacyArchiveOrCancelStatus(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const t = input.trim();
  if (t === "archived" || t === "cancelled") return false;
  const u = t.toUpperCase();
  return u === "ARCHIVED" || u === "CANCELLED";
}
