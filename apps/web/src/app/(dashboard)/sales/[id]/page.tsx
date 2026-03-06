import { requireAuth } from "@/lib/utils";
import { SaleDetailClient } from "./SaleDetailClient";

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();
  return <SaleDetailClient saleId={params.id} />;
}
