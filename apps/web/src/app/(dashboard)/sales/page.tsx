import { requireAuth } from "@/lib/utils";
import { SalesClient } from "./SalesClient";

export default async function SalesPage() {
  await requireAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-gray-500 text-sm mt-0.5">Real sales and account statements</p>
      </div>
      <SalesClient />
    </div>
  );
}
