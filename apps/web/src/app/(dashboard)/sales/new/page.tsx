import { requireAuth } from "@/lib/utils";
import { NewSaleClient } from "./NewSaleClient";

export default async function NewSalePage() {
  await requireAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New sale</h1>
        <p className="text-gray-500 text-sm mt-0.5">Create a sale from a project and optional quote</p>
      </div>
      <NewSaleClient />
    </div>
  );
}
