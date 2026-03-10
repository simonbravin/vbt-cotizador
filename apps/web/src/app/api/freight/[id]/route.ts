import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().optional(),
  freightPerContainer: z.number().min(0).optional(),
  isDefault: z.boolean().optional(),
  expiryDate: z.string().nullable().optional(), // YYYY-MM-DD or null to clear
  notes: z.string().optional(),
}).partial();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.freightRateProfile.findUnique({ where: { id: params.id }, include: { country: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["SUPERADMIN", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const data = parsed.data as { expiryDate?: string | null; [k: string]: unknown };
  const updateData = { ...data };
  if ("expiryDate" in data) {
    (updateData as { expiryDate: Date | null }).expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
  }
  const profile = await prisma.freightRateProfile.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json(profile);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["SUPERADMIN", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.freightRateProfile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
