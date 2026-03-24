import { requireModuleLayoutAccess } from "@/lib/module-layout-access";

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModuleLayoutAccess("clients");
  return <>{children}</>;
}

