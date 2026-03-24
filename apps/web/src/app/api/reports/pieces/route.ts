import { NextResponse } from "next/server";
import { requireModuleRouteAuth } from "@/lib/module-route-auth";

/**
 * Pieces report: stubbed, not used by main reports flow.
 * Returns empty aggregates. See docs/MODULE-MIGRATION-STATUS.md.
 */
export async function GET() {
  const auth = await requireModuleRouteAuth("reports");
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    byQty: [],
    byKg: [],
    byM2: [],
  });
}
