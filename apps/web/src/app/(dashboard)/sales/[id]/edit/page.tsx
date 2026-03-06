import { requireAuth } from "@/lib/utils";
import { EditSaleClient } from "./EditSaleClient";

export default async function EditSalePage({ params }: { params: { id: string } }) {
  await requireAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit sale</h1>
        <p className="text-gray-500 text-sm mt-0.5">Update financials and status</p>
      </div>
      <EditSaleClient saleId={params.id} />
    </div>
  );
}
