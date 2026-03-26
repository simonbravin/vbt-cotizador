import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { uploadToR2, getDownloadUrl, isR2StorageKey } from "@/lib/r2-client";
import { requireSession, TenantError, tenantErrorStatus } from "@/lib/tenant";
import { checkRateLimit, getRateLimitIdentifier, RateLimitExceededError } from "@/lib/rate-limit";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  try {
    const sessionUser = await requireSession();
    const userId = sessionUser.userId ?? sessionUser.id;
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });
    const image = row?.image?.trim();
    if (!image) {
      return NextResponse.json({ error: "No avatar" }, { status: 404 });
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return NextResponse.redirect(image);
    }

    if (!isR2StorageKey(image)) {
      return NextResponse.json({ error: "Invalid avatar reference" }, { status: 404 });
    }

    try {
      const url = await getDownloadUrl(image);
      return NextResponse.redirect(url);
    } catch {
      return NextResponse.json({ error: "Avatar unavailable" }, { status: 503 });
    }
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    await checkRateLimit(getRateLimitIdentifier(req), "create_update");
  } catch (e) {
    if (e instanceof RateLimitExceededError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  if (!process.env.R2_BUCKET_NAME) {
    return NextResponse.json(
      { error: "Storage not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)" },
      { status: 503 }
    );
  }

  try {
    const sessionUser = await requireSession();
    const userId = sessionUser.userId ?? sessionUser.id;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file (field name: file)" }, { status: 400 });
    }

    const type = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "Use JPEG, PNG, or WebP" }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const base = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const filename = `${randomUUID()}_${base || "avatar"}${ext || ".jpg"}`;
    const storageKey = `users/${userId}/avatars/${filename}`;

    try {
      await uploadToR2(file, storageKey);
    } catch (err) {
      console.error("[profile/avatar POST]", err);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: storageKey },
    });

    return NextResponse.json({ ok: true, storageKey });
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    throw e;
  }
}
