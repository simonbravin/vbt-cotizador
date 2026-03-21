import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveOrg, TenantError, tenantErrorStatus } from "@/lib/tenant";
import {
  addDeliverable,
  addEngineeringReviewEvent,
  getEngineeringRequestById,
  serializeEngineeringTimelineEvent,
} from "@vbt/core";
import { createActivityLog } from "@/lib/audit";
import { sendPartnerEngineeringEventEmail } from "@/lib/engineering-email";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  fileUrl: z.string().min(1),
  fileName: z.string().nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireActiveOrg();
    if (!user.isPlatformSuperadmin) {
      return NextResponse.json(
        { error: "Only platform administrators can upload revisions / deliverables." },
        { status: 403 }
      );
    }
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 }
      );
    }
    const tenantCtx = {
      userId: user.userId ?? user.id,
      organizationId: user.activeOrgId ?? null,
      isPlatformSuperadmin: user.isPlatformSuperadmin,
    };
    const deliverable = await addDeliverable(prisma, tenantCtx, params.id, {
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName ?? null,
    });
    const label =
      (parsed.data.title && parsed.data.title.trim()) ||
      (parsed.data.fileName && parsed.data.fileName.trim()) ||
      deliverable.fileName ||
      "revision";
    try {
      await addEngineeringReviewEvent(prisma, tenantCtx, params.id, {
        body: serializeEngineeringTimelineEvent({
          k: "platform_revision",
          label,
          version: deliverable.version,
        }),
        visibility: "partner",
      });
    } catch (e) {
      console.error("[engineering deliverables POST] timeline event", e);
    }
    const refreshed = await getEngineeringRequestById(prisma, tenantCtx, params.id, {
      includeInternalReviews: true,
    });
    if (refreshed?.organizationId) {
      await createActivityLog({
        organizationId: refreshed.organizationId,
        userId: user.userId ?? user.id,
        action: "engineering_revision_uploaded",
        entityType: "engineering_request",
        entityId: params.id,
        metadata: { version: deliverable.version, title: label },
      });
    }
    if (refreshed?.organizationId) {
      void sendPartnerEngineeringEventEmail({
        organizationId: refreshed.organizationId,
        event: "revision",
        requestId: params.id,
        revisionLabel: label,
      }).catch((err) => console.warn("[engineering email] revision", err));
    }
    return NextResponse.json({ deliverable, request: refreshed }, { status: 201 });
  } catch (e) {
    if (e instanceof TenantError) {
      return NextResponse.json({ error: e.message }, { status: tenantErrorStatus(e) });
    }
    throw e;
  }
}
