import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function DashboardHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("dashboard");
  return <>{children}</>;
}

