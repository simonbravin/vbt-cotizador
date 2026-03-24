import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("sales");
  return <>{children}</>;
}

