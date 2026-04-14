import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEffectiveOrganizationId, requireSession, TenantError } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { ApiHttpError } from "@/lib/api-error";
import {
  canManageBillingEntities,
  requireSalesScopedOrganizationId,
  resolveOrganizationIdForSaleCreate,
  salesOrgScopeOrThrow,
} from "@/lib/sales-access";
import { ensureBillingEntities } from "@/lib/partner-sales";
import { z } from "zod";

const postBodySchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""))
    .refine((s) => s.length > 0, "Invalid slug"),
  organizationId: z.string().optional(),
});

async function entitiesGetHandler(req: Request) {
  const user = (await requireSession()) as SessionUser;
  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "1";

  if (!user.isPlatformSuperadmin) {
    const organizationId = getEffectiveOrganizationId(user);
    if (!organizationId) return NextResponse.json([]);
    await ensureBillingEntities(organizationId);
    const list = await prisma.billingEntity.findMany({
      where: { organizationId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    return NextResponse.json(list);
  }

  const scoped = await requireSalesScopedOrganizationId(user, url);
  const organizationId = salesOrgScopeOrThrow(scoped);
  await ensureBillingEntities(organizationId);
  const list = await prisma.billingEntity.findMany({
    where: { organizationId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  return NextResponse.json(list);
}

async function entitiesPostHandler(req: Request) {
  const user = (await requireSession()) as SessionUser;
  if (!canManageBillingEntities(user)) {
    throw new TenantError("Forbidden", "FORBIDDEN");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiHttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiHttpError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.issues.map((issue) => ({
      path: issue.path.join(".") || undefined,
      message: issue.message,
    })));
  }

  const url = new URL(req.url);
  const organizationId = salesOrgScopeOrThrow(
    await resolveOrganizationIdForSaleCreate(user, url, parsed.data.organizationId)
  );

  const name = parsed.data.name.trim();
  const slug = parsed.data.slug;

  try {
    const created = await prisma.billingEntity.create({
      data: {
        organizationId,
        name,
        slug,
        isActive: true,
      },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      throw new ApiHttpError(409, "SALES_BILLING_ENTITY_SLUG_CONFLICT", "Slug already exists for this organization.");
    }
    throw e;
  }
}

export const GET = withSaaSHandler({ module: "sales", rateLimitTier: "read" }, entitiesGetHandler);
export const POST = withSaaSHandler({ module: "sales", rateLimitTier: "create_update" }, entitiesPostHandler);
