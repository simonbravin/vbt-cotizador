import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  client: z.string().optional(),
  location: z.string().optional(),
  countryId: z.string().nullable().optional(),
  totalKits: z.number().min(1).optional(),
  description: z.string().optional(),
  wallAreaM2Total: z.number().min(0).optional(),
  wallAreaM2S80: z.number().min(0).optional(),
  wallAreaM2S150: z.number().min(0).optional(),
  wallAreaM2S200: z.number().min(0).optional(),
  plannedStartDate: z.string().nullable().optional(),
  durationWeeks: z.number().min(0).nullable().optional(),
  kitsPerContainer: z.number().min(0).optional(),
  numContainers: z.number().min(0).optional(),
}).partial();

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const project = await prisma.project.findFirst({
    where: { id: params.id, orgId: user.orgId },
    include: {
      country: { select: { id: true, name: true, code: true } },
      quotes: {
        include: { country: true },
        orderBy: { createdAt: "desc" },
      },
      revitImports: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (["VIEWER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data as Record<string, unknown>;
  const changedKeys = Object.keys(parsed.data);
  if (data.countryId === null || data.countryId === "") {
    data.countryId = null;
  }
  if (data.plannedStartDate === "" || data.plannedStartDate === null) {
    data.plannedStartDate = null;
  } else if (typeof data.plannedStartDate === "string") {
    data.plannedStartDate = new Date(data.plannedStartDate);
  }
  if (data.wallAreaM2S80 !== undefined || data.wallAreaM2S150 !== undefined || data.wallAreaM2S200 !== undefined) {
    const existing = await prisma.project.findUnique({ where: { id: params.id } });
    if (existing) {
      const s80 = Number(data.wallAreaM2S80 ?? existing.wallAreaM2S80);
      const s150 = Number(data.wallAreaM2S150 ?? existing.wallAreaM2S150);
      const s200 = Number(data.wallAreaM2S200 ?? existing.wallAreaM2S200);
      (data as Record<string, unknown>).wallAreaM2Total = s80 + s150 + s200;
    }
  } else if (data.wallAreaM2Total !== undefined) {
    (data as Record<string, unknown>).wallAreaM2S80 = 0;
    (data as Record<string, unknown>).wallAreaM2S150 = Number(data.wallAreaM2Total) || 0;
    (data as Record<string, unknown>).wallAreaM2S200 = 0;
  }

  const project = await prisma.project.update({
    where: { id: params.id },
    data: data as any,
  });

  await createAuditLog({
    orgId: user.orgId,
    userId: user.id,
    action: "PROJECT_UPDATED",
    entityType: "Project",
    entityId: params.id,
    meta: { changed: changedKeys },
  });

  return NextResponse.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["SUPERADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.project.update({
    where: { id: params.id },
    data: { isArchived: true },
  });

  return NextResponse.json({ success: true });
}
