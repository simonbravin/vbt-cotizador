import { requireAuth } from "@/lib/utils";
import { redirect } from "next/navigation";
import SettingsWarehousesClient from "./SettingsWarehousesClient";

export default async function SettingsWarehousesPage() {
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }
  return <SettingsWarehousesClient />;
}
