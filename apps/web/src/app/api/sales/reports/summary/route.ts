import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Stub summary until Sales module is fully migrated. Returns 200 so Reports page does not break. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    totalSales: 0,
    totalValue: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
    byStatus: {} as Record<string, number>,
    entitySummary: [] as { id: string; name: string; slug: string; invoiced: number; paid: number; balance: number }[],
  });
}
