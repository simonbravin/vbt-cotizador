import { requireAuth } from "@/lib/utils";
import { redirect } from "next/navigation";
import { StatementsClient } from "./StatementsClient";

export default async function StatementsPage() {
  try {
    await requireAuth();
  } catch (e) {
    if ((e as Error)?.message === "NEXT_REDIRECT") throw e;
    redirect("/login");
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account statements</h1>
        <p className="text-gray-500 text-sm mt-0.5">By client and entity, with export</p>
      </div>
      <StatementsClient />
    </div>
  );
}
