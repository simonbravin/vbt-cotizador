/**
 * Builds optional structured detail for the notifications bell (client-rendered with i18n).
 * Also collects related ids for batch lookups in GET /api/saas/notifications.
 */

export type ActivityMeta = Record<string, unknown> | null | undefined;

export function asActivityMeta(metadata: unknown): ActivityMeta {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  return metadata as Record<string, unknown>;
}

export function metaString(meta: ActivityMeta, key: string): string | null {
  if (!meta) return null;
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function metaNumber(meta: ActivityMeta, key: string): number | undefined {
  if (!meta) return undefined;
  const v = meta[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

export function getActorDisplayName(user: { fullName: string; email: string } | null | undefined): string | null {
  if (!user) return null;
  const n = user.fullName?.trim();
  if (n) return n;
  const e = user.email?.trim();
  return e || null;
}

export type NotificationStructuredDetail =
  | { kind: "subtitle"; parts: string[] }
  | {
      kind: "inventory_movement";
      movementType: string;
      warehouseName: string;
      pieceName: string;
      quantityDelta: number;
      lengthMm?: number;
      lineCount?: number;
    }
  | { kind: "inventory_bulk"; fileName: string; warehouseName: string; movementType: string; distinctPieces: number }
  | { kind: "inventory_prune"; deleted: number };

export type EnrichmentMaps = {
  projectNameById: Record<string, string>;
  quoteNumberById: Record<string, string>;
  userLabelById: Record<string, string>;
  programTitleById: Record<string, string>;
};

export type ActivityRowForEnrichment = {
  entityType: string;
  entityId: string;
  action: string;
  metadataJson: unknown;
};

export function collectNotificationEnrichmentIds(rows: ActivityRowForEnrichment[]) {
  const projectIds = new Set<string>();
  const quoteIds = new Set<string>();
  const userIds = new Set<string>();
  const programIds = new Set<string>();

  for (const r of rows) {
    const et = r.entityType.toLowerCase();
    const act = r.action.toLowerCase();
    const m = asActivityMeta(r.metadataJson);

    if (et === "project" || act.startsWith("project_")) {
      if (!metaString(m, "projectName")) projectIds.add(r.entityId);
    }

    if (et === "quote" || act.includes("quote")) {
      if (!metaString(m, "quoteNumber")) quoteIds.add(r.entityId);
      const pid = metaString(m, "projectId");
      if (pid) projectIds.add(pid);
    }

    if (et === "engineering_request" || act.startsWith("engineering_")) {
      const pid = metaString(m, "projectId");
      if (pid) projectIds.add(pid);
      const assignee = metaString(m, "assignedToUserId");
      if (assignee) userIds.add(assignee);
    }

    if (act === "member_invited" || act === "member_role_changed") {
      const uid = metaString(m, "userId");
      if (uid) userIds.add(uid);
    }

    if (act === "training_enrolled") {
      const prog = metaString(m, "programId");
      if (prog) programIds.add(prog);
      const uid = metaString(m, "userId");
      if (uid) userIds.add(uid);
    }
  }

  return { projectIds, quoteIds, userIds, programIds };
}

export function buildUserLabelMap(
  users: { id: string; fullName: string; email: string }[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const u of users) {
    const label = u.fullName?.trim() || u.email?.trim();
    if (label) out[u.id] = label;
  }
  return out;
}

export function buildNotificationStructuredDetail(
  row: ActivityRowForEnrichment,
  maps: EnrichmentMaps
): NotificationStructuredDetail | null {
  const et = row.entityType.toLowerCase();
  const act = row.action.toLowerCase();
  const m = asActivityMeta(row.metadataJson);

  if (act === "inventory_movement" || et === "inventory_transaction") {
    const movementType = metaString(m, "movementType") ?? "adjustment_in";
    const warehouseName = metaString(m, "warehouseName") ?? "";
    const pieceName = metaString(m, "pieceName") ?? "";
    const quantityDelta = metaNumber(m, "quantityDelta") ?? 0;
    const lengthMm = metaNumber(m, "lengthMm");
    const lineCount = metaNumber(m, "lineCount");
    if (!warehouseName && !pieceName) return null;
    return {
      kind: "inventory_movement",
      movementType,
      warehouseName,
      pieceName,
      quantityDelta,
      lengthMm: lengthMm !== undefined && lengthMm !== 0 ? lengthMm : undefined,
      lineCount: lineCount != null && lineCount > 1 ? lineCount : undefined,
    };
  }

  if (act === "inventory_bulk_import") {
    const fileName = metaString(m, "fileName") ?? "";
    const warehouseName = metaString(m, "warehouseName") ?? "";
    const movementType = metaString(m, "movementType") ?? "adjustment_in";
    const distinctPieces = metaNumber(m, "distinctPieces") ?? 0;
    if (!fileName && !warehouseName) return null;
    return { kind: "inventory_bulk", fileName, warehouseName, movementType, distinctPieces };
  }

  if (act === "inventory_levels_pruned") {
    const deleted = metaNumber(m, "deleted") ?? 0;
    return { kind: "inventory_prune", deleted };
  }

  if (et === "quote" || act.includes("quote")) {
    const qn = metaString(m, "quoteNumber") ?? maps.quoteNumberById[row.entityId];
    const pid = metaString(m, "projectId");
    const proj = pid ? maps.projectNameById[pid] : null;
    const left = qn ? (qn.startsWith("#") ? qn : `#${qn}`) : null;
    const parts = [left, proj].filter(Boolean) as string[];
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  if (et === "project" || act.startsWith("project_")) {
    const name = metaString(m, "projectName") ?? maps.projectNameById[row.entityId];
    const parts: string[] = [];
    if (name) parts.push(name);
    if (act === "project_updated") {
      const changed = m?.["changed"];
      if (Array.isArray(changed) && changed.length) {
        const keys = changed.filter((x): x is string => typeof x === "string").slice(0, 6);
        if (keys.length) parts.push(keys.join(", "));
      }
    }
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  if (et === "client" || act === "client_created") {
    const name = metaString(m, "name");
    if (name) return { kind: "subtitle", parts: [name] };
    return null;
  }

  if (et === "engineering_request" || act.startsWith("engineering_")) {
    const rn = metaString(m, "requestNumber");
    const pid = metaString(m, "projectId");
    const proj = pid ? maps.projectNameById[pid] : null;
    if (act === "engineering_status_changed") {
      const from = metaString(m, "fromStatus");
      const to = metaString(m, "toStatus");
      const statusLine = from && to ? `${from} → ${to}` : to ?? from ?? null;
      const parts = [rn, proj, statusLine].filter(Boolean) as string[];
      if (parts.length) return { kind: "subtitle", parts };
      return null;
    }
    if (act === "engineering_assignment_changed") {
      const assigneeId = metaString(m, "assignedToUserId");
      const assignee = assigneeId ? maps.userLabelById[assigneeId] ?? assigneeId : null;
      const parts = [rn, proj, assignee].filter(Boolean) as string[];
      if (parts.length) return { kind: "subtitle", parts };
      return null;
    }
    const parts = [rn, proj].filter(Boolean) as string[];
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  if (et === "document" || act === "document_uploaded") {
    const title = metaString(m, "title");
    if (title) return { kind: "subtitle", parts: [title] };
    return null;
  }

  if (act === "partner_created") {
    const cn = metaString(m, "companyName");
    if (cn) return { kind: "subtitle", parts: [cn] };
    return null;
  }

  if (act === "partner_updated") {
    const cn = metaString(m, "companyName");
    if (cn) return { kind: "subtitle", parts: [cn] };
    return null;
  }

  if (act === "partner_invite_sent") {
    const email = metaString(m, "email");
    const role = metaString(m, "role");
    const parts = [email, role].filter(Boolean) as string[];
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  if (normTerritoryAction(act)) {
    const cc = metaString(m, "countryCode");
    if (cc) return { kind: "subtitle", parts: [cc] };
    return null;
  }

  if (act === "member_invited") {
    const email = metaString(m, "email");
    const uid = metaString(m, "userId");
    const who = email ?? (uid ? maps.userLabelById[uid] : null);
    const role = metaString(m, "role");
    const parts = [who, role].filter(Boolean) as string[];
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  if (act === "member_role_changed") {
    const uid = metaString(m, "userId");
    const who = uid ? maps.userLabelById[uid] ?? uid : null;
    const role = metaString(m, "role");
    const parts = [who, role].filter(Boolean) as string[];
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  if (act === "engineering_partner_file_uploaded") {
    const fn = metaString(m, "fileName");
    if (fn) return { kind: "subtitle", parts: [fn] };
    return null;
  }

  if (act === "engineering_revision_uploaded") {
    const title = metaString(m, "title");
    const ver = metaString(m, "version");
    const parts = [title, ver].filter(Boolean) as string[];
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  if (act === "training_enrolled") {
    const progId = metaString(m, "programId");
    const progTitle = progId ? maps.programTitleById[progId] : null;
    const uid = metaString(m, "userId");
    const who = uid ? maps.userLabelById[uid] : null;
    const parts = [progTitle, who].filter(Boolean) as string[];
    if (parts.length) return { kind: "subtitle", parts };
    return null;
  }

  return null;
}

function normTerritoryAction(act: string) {
  return act === "territory_assigned" || act === "territory_removed";
}

/** Movement types with `admin.inventory.txType.*` i18n keys (bell + API metadata). */
export const INVENTORY_TRANSACTION_TYPE_CODES = [
  "purchase_in",
  "sale_out",
  "project_consumption",
  "project_surplus",
  "adjustment_in",
  "adjustment_out",
  "transfer_in",
  "transfer_out",
] as const;

export const INVENTORY_TX_LABEL_CODES = new Set<string>(INVENTORY_TRANSACTION_TYPE_CODES);
