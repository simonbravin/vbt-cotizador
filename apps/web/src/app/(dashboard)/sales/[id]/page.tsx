import { requireAuth } from "@/lib/utils";
import { redirect } from "next/navigation";
import { SaleDetailClient } from "./SaleDetailClient";

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  try {
    await requireAuth();
  } catch (e) {
    if ((e as Error)?.message === "NEXT_REDIRECT") throw e;
    redirect("/login");
  }
  return <SaleDetailClient saleId={params.id} />;
}
