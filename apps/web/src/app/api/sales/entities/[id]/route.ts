import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSession, TenantError } from "@/lib/tenant";
import { withSaaSHandler } from "@/lib/saas-handler";
import { ApiHttpError } from "@/lib/api-error";
import { billingEntityOrganizationIdIfManageable, canManageBillingEntities } from "@/lib/sales-access";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""))
    .refine((s) => s.length > 0, "Invalid slug")
    .optional(),
  isActive: z.boolean().optional(),
});

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function billingEntityPatchHandler(req: Request, routeContext: unknown) {
  const user = (await requireSession()) as SessionUser;
  if (!canManageBillingEntities(user)) {
    throw new TenantError("Forbidden", "FORBIDDEN");
  }

  const paramsMaybe = (routeContext as RouteCtx).params;
  const paramsObj = paramsMaybe instanceof Promise ? await paramsMaybe : paramsMaybe;
  const { id } = paramsObj;

  const orgId = await billingEntityOrganizationIdIfManageable(user, id);
  if (!orgId) throw new ApiHttpError(404, "RECORD_NOT_FOUND", "Billing entity not found");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiHttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiHttpError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.issues.map((issue) => ({
      path: issue.path.join(".") || undefined,
      message: issue.message,
    })));
  }

  const data = parsed.data;
  if (data.name === undefined && data.slug === undefined && data.isActive === undefined) {
    throw new ApiHttpError(400, "VALIDATION_ERROR", "No fields to update", [
      { message: "Provide at least one of name, slug, or isActive." },
    ]);
  }

  try {
    const updated = await prisma.billingEntity.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      throw new ApiHttpError(409, "SALES_BILLING_ENTITY_SLUG_CONFLICT", "Slug already exists for this organization.");
    }
    throw e;
  }
}

export const PATCH = withSaaSHandler({ module: "sales", rateLimitTier: "create_update" }, billingEntityPatchHandler);
