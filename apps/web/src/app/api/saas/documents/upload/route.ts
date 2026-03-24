import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requirePlatformSuperadmin, TenantError, tenantErrorStatus } from "@/lib/tenant";
import { uploadToR2 } from "@/lib/r2-client";
import { withSaaSHandler } from "@/lib/saas-handler";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * POST multipart field `file`. Superadmin only. Storage key: platform/documents/{uuid}_{safeName}
 * Response: { url: storageKey, fileName: original name } (same shape as /api/upload for documents).
 */
async function postHandler(req: Request) {
  try {
    await requirePlatformSuperadmin();
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const storageKey = `platform/documents/${filename}`;

  try {
    await uploadToR2(file, storageKey);
    return NextResponse.json({ url: storageKey, fileName: file.name });
  } catch (err) {
    console.error("[api/saas/documents/upload]", err);
    return NextResponse.json(
      {
        error: process.env.R2_BUCKET_NAME
          ? "Upload failed"
          : "Storage not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)",
      },
      { status: process.env.R2_BUCKET_NAME ? 500 : 503 }
    );
  }
}

export const POST = withSaaSHandler({ rateLimitTier: "create_update", module: "documents" }, postHandler);
