import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePlatformSuperadmin } from "@/lib/tenant";
import { prisma } from "@/lib/db";

function pieceToResponse(p: { id: string; dieNumber: string | null; canonicalName: string; systemCode: string; usefulWidthMm: number | null; lbsPerMCored: number | null; kgPerMCored: number | null; pricePerM2Cored: number | null; isActive: boolean }) {
  return {
    ...p,
    costs: p.pricePerM2Cored != null ? [{ pricePerM2Cored: p.pricePerM2Cored }] : [],
  };
}

/** GET one piece — any authenticated (partners see only if piece system is in their enabled systems). */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const piece = await prisma.catalogPiece.findUnique({ where: { id: params.id } });
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pieceToResponse(piece));
}

/** PATCH: edit piece (price, usefulWidth, isActive) — superadmin only. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requirePlatformSuperadmin();
  } catch {
    return NextResponse.json({ error: "Forbidden: only superadmin can edit the catalog" }, { status: 403 });
  }

  const piece = await prisma.catalogPiece.findUnique({ where: { id: params.id } });
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { pricePerM2Cored?: number; usefulWidthMm?: number; isActive?: boolean } = {};
  if (typeof body.pricePerM2Cored === "number") data.pricePerM2Cored = body.pricePerM2Cored;
  if (typeof body.pricePerMCored === "number") data.pricePerM2Cored = body.pricePerMCored; // backward compat
  if (typeof body.usefulWidthMm === "number") data.usefulWidthMm = body.usefulWidthMm;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const updated = await prisma.catalogPiece.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(pieceToResponse(updated));
}
