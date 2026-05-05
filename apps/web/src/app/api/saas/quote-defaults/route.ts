import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQuoteDefaultsForOrg, resolvePartnerPricingConfig } from "@vbt/core";
import { getEffectiveActiveOrgId } from "@/lib/tenant";

/**
 * GET: Returns quote defaults for the current user's active org.
 * Partners receive only effective rates (factory × (1 + VL commission %)), never raw factory USD/m².
 * Optional `?country=XX` scopes partner quote_defaults overrides (ISO alpha-2).
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; isPlatformSuperadmin?: boolean; activeOrgId?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeOrgId = await getEffectiveActiveOrgId(user as import("@/lib/auth").SessionUser);
  if (!activeOrgId) {
    return NextResponse.json(
      { error: "No active organization. Select an organization to create quotes." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(req.url);
    const country = url.searchParams.get("country")?.trim().toUpperCase() || null;
    const defaults = await getQuoteDefaultsForOrg(prisma, activeOrgId);
    const resolved = await resolvePartnerPricingConfig(prisma, {
      organizationId: activeOrgId,
      projectCountryCode: country,
    });
    return NextResponse.json({
      ...defaults,
      defaultPartnerMarkupPct: resolved.defaultPartnerMarkupPct,
      partnerMarkupMinPct: resolved.allowedPartnerMarkupMinPct,
      partnerMarkupMaxPct: resolved.allowedPartnerMarkupMaxPct,
    });
  } catch (e) {
    console.error("[quote-defaults GET]", e);
    return NextResponse.json({ error: "Failed to load quote defaults" }, { status: 500 });
  }
}
