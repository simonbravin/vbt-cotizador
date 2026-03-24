import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("inventory");
  return <>{children}</>;
}

