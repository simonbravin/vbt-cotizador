import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, TenantError, tenantErrorStatus } from "@/lib/tenant";
import { checkRateLimit, getRateLimitIdentifier, RateLimitExceededError } from "@/lib/rate-limit";

const patchSchema = z.object({
  phone: z
    .string()
    .max(40, "Phone too long")
    .optional()
    .transform((s) => (s === undefined ? undefined : s.trim() === "" ? null : s.trim())),
  locale: z.enum(["en", "es"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    await checkRateLimit(getRateLimitIdentifier(req), "create_update");
  } catch (e) {
    if (e instanceof RateLimitExceededError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }

  try {
    const sessionUser = await requireSession();
    const userId = sessionUser.userId ?? sessionUser.id;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      );
    }

    const { phone, locale } = parsed.data;
    if (phone === undefined && locale === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(phone !== undefined ? { phone } : {}),
        ...(locale !== undefined ? { emailLocale: locale } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    throw e;
  }
}
