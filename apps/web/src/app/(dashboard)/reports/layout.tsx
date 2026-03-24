import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("reports", {
    allowRoles: ["org_admin", "sales_user"],
  });
  return <>{children}</>;
}
