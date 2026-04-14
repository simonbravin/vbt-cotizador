export type ProjectBaselineRow = {
  id: string;
  clientId: string | null;
  baselineQuoteId: string | null;
};

/**
 * Validates multi-project sale line project ids: no duplicates, all exist in `projects`,
 * same client as the sale, and each has a baseline quote configured.
 */
export function validateSaleProjectLinesBaselineAndClient(
  lines: { projectId: string }[],
  projects: ProjectBaselineRow[],
  expectedClientId: string
): void {
  const ids = lines.map((l) => l.projectId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error("Duplicate project in sale lines");
  }
  if (projects.length !== unique.size) {
    throw new Error("One or more projects were not found");
  }
  const byId = new Map(projects.map((p) => [p.id, p]));
  for (const id of unique) {
    const p = byId.get(id);
    if (!p) {
      throw new Error("One or more projects were not found");
    }
    if (p.clientId !== expectedClientId) {
      throw new Error("All projects must belong to the selected client");
    }
    if (!p.baselineQuoteId) {
      throw new Error("Each project must have a baseline quote set before it can be included in a sale");
    }
  }
}
