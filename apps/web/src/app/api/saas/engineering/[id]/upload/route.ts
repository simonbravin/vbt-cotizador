import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getTenantContext, TenantError, tenantErrorStatus } from "@/lib/tenant";
import { assertPartnerModuleEnabled } from "@/lib/module-access";
import { uploadToR2 } from "@/lib/r2-client";
import { checkRateLimit, getRateLimitIdentifier, RateLimitExceededError } from "@/lib/rate-limit";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * POST multipart (field "file") for an engineering request.
 * Storage path uses the request's partner organization (not superadmin cookie org).
 * Partner or platform superadmin may upload if they can access the request.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await checkRateLimit(getRateLimitIdentifier(req), "create_update");
  } catch (e) {
    if (e instanceof RateLimitExceededError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  try {
    const ctx = await getTenantContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertPartnerModuleEnabled("engineering", ctx);

    const request = await prisma.engineeringRequest.findUnique({
      where: { id: params.id },
      select: { organizationId: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canAccess =
      ctx.isPlatformSuperadmin || request.organizationId === ctx.activeOrgId;
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file. Send as form field 'file'." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(MAX_SIZE / 1024 / 1024)} MB)` },
        { status: 400 }
      );
    }

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const base = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);
    const uniqueId = randomUUID();
    const filename = `${uniqueId}_${base}${ext}`;
    const storageKey = `${request.organizationId}/engineering/${params.id}/${filename}`;

    try {
      await uploadToR2(file, storageKey);
      return NextResponse.json({ url: storageKey, fileName: file.name });
    } catch (err) {
      console.error("[engineering upload]", err);
      return NextResponse.json(
        {
          error: process.env.R2_BUCKET_NAME
            ? "Upload failed"
            : "Storage not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)",
        },
        { status: process.env.R2_BUCKET_NAME ? 500 : 503 }
      );
    }
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    throw e;
  }
}
